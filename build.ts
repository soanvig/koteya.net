import assert from 'node:assert';
import crypto, { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { $, glob, ProcessOutput } from "zx";
import { tmpdir } from 'os';

type FileInfo = {
  /** starts with dot */
  fileExt: string;
  /** without file ext */
  fileName: string;
  fileDir: string;
  filePath: string;
  content: Buffer;
}

type FileContext = {
  original: FileInfo;
  memory: FileInfo;
}

type PipeFn = (context: FileContext) => FileContext | Promise<FileContext>;

const helpers = {
  trimTemplateString: (input: string) => input.split('\n').map(line => line.trimStart()).join('\n'),
  getFileDate: (path: string) => {
    const { stdout: fileDate } = $.sync`git log -1 --pretty="format:%ci" ${path}`;

    if (fileDate.length === 0) {
      return new Date().toISOString();
    } else {
      const date = new Date(fileDate);

      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    }
  },
  getFileCreationDate: (path: string) => {
    const { stdout: fileDate } = $.sync`git log --diff-filter=A --follow -1 --pretty="format:%ci" -- ${path}`;

    if (fileDate.length === 0) {
      return new Date().toISOString();
    } else {
      const date = new Date(fileDate);

      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    }
  },
  calculateHashForBuffer(data: Buffer) {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  },
  getMarkdownPageTitle: (path: string) => {
    const prefix = '## ';

    try {
      const { stdout: header } = $.sync`grep -m 1 ${prefix} ${path}`;
      return header.replace(prefix, '').trim();
    } catch (e) {
      if (e instanceof ProcessOutput) {
        throw new Error(`Error encountered in grepping for header ## in file ${path}`);
      }

      throw e;
    }
  }
}

const getFileInfo = (filePath: string): FileInfo => {
  const fileExt = extname(filePath);

  return {
    filePath,
    fileExt,
    fileDir: dirname(filePath),
    fileName: basename(filePath, fileExt),
    content: readFileSync(filePath),
  }
}

const createFileContext = (filePath: string): FileContext => {
  const info = getFileInfo(filePath);

  return {
    original: info,
    memory: info,
  }
}

const markdownToHtml = (): PipeFn => async (context) => {
  if (context.memory.fileExt === '.md') {
    const p = $`comrak --syntax-highlighting none --unsafe --gfm --header-ids ""`;
    p.stdin.write(context.memory.content);
    p.stdin.end();

    const result = await p;

    return {
      ...context,
      memory: {
        ...context.memory,
        fileExt: '.html',
        content: Buffer.from(result.stdout, 'utf-8'),
      }
    }
  } else {
    return context;
  }
}

const cleanupPath = (params: { sourceDir: string }): PipeFn => (context) => {
  const fileDir = resolve(context.memory.fileDir);
  const sourceDir = resolve(params.sourceDir);
  const newDir = fileDir.startsWith(sourceDir) ? fileDir.slice(sourceDir.length + 1) : fileDir; // +1 for slash

  return {
    ...context,
    memory: {
      ...context.memory,
      fileDir: newDir,
      filePath: join(newDir, context.memory.fileName + context.memory.fileExt)
    }
  }
}

const saveFile = (params: { targetDir: string }): PipeFn => async (context) => {
  const finalDir = join(params.targetDir, context.memory.fileDir);
  const finalPath = join(finalDir, context.memory.fileName + context.memory.fileExt);

  await mkdir(finalDir, { recursive: true });
  await writeFile(finalPath, context.memory.content);

  return context;
}

const tokenHtmlToC = (): PipeFn => (context) => {
  if (context.memory.fileExt !== '.html') {
    return context;
  }

  const content = context.memory.content.toString('utf-8');

  const newContent = content.replace('{{toc}}', () => {
    const headers = [...content.matchAll(/<h[2-6]{1}>.*?<\/h[2-6]{1}>/g)].map(match => match[0]);
    const mapped = headers.map(header => {
      const idMatch = header.match(/id="(.+?)"/);
      assert(idMatch);

      const contentMatch = header.match(/<\/a>(.+)<\/h/);
      assert(contentMatch);

      const levelMatch = header.match(/<h([1-6]{1})/);
      assert(levelMatch);

      return {
        id: idMatch[1],
        content: contentMatch[1],
        level: Number(levelMatch[1]),
      }
    });

    return helpers.trimTemplateString(`
      <ul>
        ${mapped.map(header => `
          <li style="margin-left: ${Math.max(header.level - 3, 0) * 20}px"><a href="#${header.id}">${header.content}</a></li>
        `.trim()).join('\n')}
      </ul>
    `);
  });

  return {
    ...context,
    memory: {
      ...context.memory,
      content: Buffer.from(newContent),
    }
  };
}

const tokenHtmlBuildDate = (): PipeFn => (context) => {
  if (context.memory.fileExt !== '.html') {
    return context;
  }

  const content = context.memory.content.toString('utf-8');

  const newContent = content.replace('{{buildDate}}', () => {
    const date = new Date();

    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  });

  return {
    ...context,
    memory: {
      ...context.memory,
      content: Buffer.from(newContent),
    }
  };
}

const tokenHtmlFileDate = (): PipeFn => (context) => {
  if (context.memory.fileExt !== '.html') {
    return context;
  }

  const content = context.memory.content.toString('utf-8');

  const newContent = content.replaceAll(/({{fileDate}})|({{fileDate\|(.*)}})/g, (match, _a, _b, filePath) => {
    const file = filePath ? join(context.original.fileDir, filePath) : context.original.filePath;

    return helpers.getFileDate(file);;
  });

  return {
    ...context,
    memory: {
      ...context.memory,
      content: Buffer.from(newContent),
    }
  };
}

const tokenHtmlFileCreationDate = (): PipeFn => (context) => {
  if (context.memory.fileExt !== '.html') {
    return context;
  }

  const content = context.memory.content.toString('utf-8');

  const newContent = content.replaceAll(/({{fileCreationDate}})|({{fileCreationDate\|(.*)}})/g, (match, _a, _b, filePath) => {
    const file = filePath ? join(context.original.fileDir, filePath) : context.original.filePath;

    return helpers.getFileCreationDate(file);
  });

  return {
    ...context,
    memory: {
      ...context.memory,
      content: Buffer.from(newContent),
    }
  };
}

const tokenHtmlFileTitle = (): PipeFn => (context) => {
  if (context.memory.fileExt !== '.html') {
    return context;
  }

  const content = context.memory.content.toString('utf-8');

  const newContent = content.replaceAll(/{{blogTitle\|(.*)}}/g, (_, filePath) => {
    const file = join(context.original.fileDir, filePath);

    return helpers.getMarkdownPageTitle(file);
  });

  return {
    ...context,
    memory: {
      ...context.memory,
      content: Buffer.from(newContent),
    }
  };
}

const assetCache: Record<string, { assetContext: FileContext, hash: string }> = {};

const extractAsset = (): PipeFn => async (context) => {
  if (context.memory.fileExt !== '.html' && context.memory.fileExt !== '.css') {
    return context;
  }

  let content = context.memory.content.toString('utf-8');

  const assetMatches = [...content.matchAll(/{{asset\|(.+)}}/g)];

  for (const assetMatch of assetMatches) {
    const match = assetMatch[0]!;
    const assetPath = assetMatch[1]!;
    const assetRootPath = isAbsolute(assetPath) ? join(process.cwd(), assetPath) : join(context.original.fileDir, assetPath);

    const { assetContext, hash } = await (async () => {
      if (assetCache[assetRootPath]) {
        return assetCache[assetRootPath];
      }

      const assetFileContext = createFileContext(assetRootPath);
      const assetContext = await runThroughPipeline(pipeline)(assetFileContext);
      const hash = helpers.calculateHashForBuffer(assetContext.memory.content);

      return { assetContext, hash }
    })();

    content = content.replaceAll(match, `/${assetContext.memory.filePath}?${hash}`);
  }

  return {
    ...context,
    memory: {
      ...context.memory,
      content: Buffer.from(content)
    }
  };
}

const wrapHtmlWithTemplate = (params: { templatePath: string }): PipeFn => {
  let builtTemplate: string | null = null;

  return async (context) => {
    if (context.memory.fileExt !== '.html') {
      return context;
    }

    if (resolve(context.original.filePath) === resolve(params.templatePath)) {
      // Template, ignore
      return context;
    }

    if (builtTemplate === null) {
      const templateFileContext = createFileContext(params.templatePath);
      builtTemplate = templateFileContext.memory.content.toString('utf-8');
    }

    const pageTitlePrefix = context.original.fileExt === '.md' ? helpers.getMarkdownPageTitle(context.original.filePath) : null;
    const contentWrapped = builtTemplate
      .replace('{{templateTitle}}', pageTitlePrefix ? `${pageTitlePrefix} - koteya.net` : 'koteya.net')
      .replace('{{page}}', context.memory.content.toString('utf-8'));

    return {
      ...context,
      memory: {
        ...context.memory,
        content: Buffer.from(contentWrapped)
      }
    };
  }
}

const compressImage = (): PipeFn => async (context) => {
  if (context.memory.fileExt !== '.webp') {
    return context;
  }

  const tmpFile = join(tmpdir(), `${randomUUID()}.webp`);
  await writeFile(tmpFile, context.memory.content);

  // Max 1000px width - no image exceeds that size anyway
  // @TODO it's not the best possible algorithm but it's ok
  await $`magick mogrify -resize 1000x\\> ${tmpFile}`;
  const newContent = await readFile(tmpFile);

  // Cleanup
  await rm(tmpFile);

  return {
    ...context,
    memory: {
      ...context.memory,
      content: newContent,
    }
  };
};

const runThroughPipeline = (pipeline: PipeFn[]): PipeFn => async (context) => {
  let updatedContext = context;

  for (const fn of pipeline) {
    updatedContext = await fn(updatedContext);
  }

  return updatedContext;
}

const pipeline: PipeFn[] = [
  markdownToHtml(),
  tokenHtmlToC(),
  wrapHtmlWithTemplate({ templatePath: './src/template.html' }),
  tokenHtmlBuildDate(),
  tokenHtmlFileDate(),
  tokenHtmlFileCreationDate(),
  tokenHtmlFileTitle(),
  extractAsset(),
  compressImage(),
  cleanupPath({ sourceDir: './src' }),
  saveFile({ targetDir: './build' }),
];

const run = async () => {
  await rm('./build', { recursive: true, force: true });

  const pages = await glob('./src/**/*.{md,html,css}');

  for (const file of pages) {
    await runThroughPipeline(pipeline)(createFileContext(file));
  }
}

await run();
