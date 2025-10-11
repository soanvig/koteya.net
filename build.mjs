import { ok as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { $, chalk, fs, glob, path, ProcessOutput } from "zx";

const build = async () => {
  const target = './build';
  const pages = await glob('./src/pages/**/*.{html,md}')
  const template = await fs.readFile('src/template.html', 'utf-8');

  for (const pagePath of pages) {
    const fileName = pagePath.replace('./src/pages/', '').replace('.md', '.html');
    const dir = `${target}/${path.dirname(fileName)}`;

    await $`mkdir -p ${dir}`;

    const content = await fs.readFile(pagePath, 'utf-8');
    const withParsedTokens = replaceTokens({ target, content, filePath: pagePath });
    const withHtml = await mdToHtml({ content: withParsedTokens, filePath: pagePath });
    const withTemplate = template
      .replace('{{page}}', () => withHtml) // fn to avoid $& replacement pattern
      .replace('{{templateTitle}}', () => {
        const pageTitle = getBlogPageTitle({ filePath: pagePath });

        if (pageTitle) {
          return `${pageTitle} - koteya.net`;
        } else {
          return `koteya.net`;
        }
      });
    const final = replaceTokens({ target, content: withTemplate, filePath: pagePath });

    await fs.writeFile(path.join(target, fileName), final, 'utf-8');

    console.log(`${chalk.green.bold('Build')} ${pagePath}`);
  }

  console.log(`${chalk.green.bold('Copy')} ./src/static`);
  await $`cp -r ./src/static/* ./build`;
}

const replaceTokens = ({ target, content, filePath }) => {
  return content.replace(/\{\{.*?\}\}/g, (value) => {
    const splitted = value.slice(2, -2).split('|');
    const [token, ...args] = splitted;

    switch (token) {
      case 'date':
        assert(args.length === 0 || args.length === 1);

        if (args.length === 0) {
          return getFileDate(filePath);
        } else {
          return getFileDate(
            path.join(path.dirname(filePath), args[0])
          );
        }
      case 'buildDate':
        return getBuildDate();
      case 'asset':
        assert(args.length === 2)

        return getAsset(target, args[0], args[1]);
      case 'toc':
        assert(args.length === 0);

        return getTableOfContent({ content });
      case 'blogTitle':
        assert(args.length === 1)

        return getBlogPageTitle({ filePath: path.join(path.dirname(filePath), args[0]) });
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        assert(args.length === 2);
        
        return getHeader(token, args[0], args[1]);
      default:
        return value;
    }
  });
}

const getFileDate = (path) => {
  const { stdout: fileDate } = $.sync`git log -1 --pretty="format:%ci" ${path}`;

  if (fileDate.length === 0) {
    return new Date().toISOString();
  } else {
    const date = new Date(fileDate);

    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  }
}

const getBuildDate = () => {
  const date = new Date();

  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

const getHeader = (level, id, text) => {
  return `<${level} id="${id}"><a href="#${id}">${'#'.repeat(level.slice(1) - 2)}</a>${text}</${level}>`
}

const getAsset = (target, finalPath, filePath) => {
  const fileContent = readFileSync(filePath);
  const md5sum = createHash('md5').update(fileContent).digest('hex');

  const finalPathWithTarget = path.join(target, finalPath);

  $.sync`mkdir -p ${path.dirname(finalPathWithTarget)}`;
  $.sync`cp ${filePath} ${finalPathWithTarget}`

  return `${finalPath}?${md5sum}`;
}

const getTableOfContent = ({ content }) => {
  const tokenMatches = content.match(/\{\{.*?\}\}/g);
  /** @type{Array<{ level: number, text: string, id: string }} */
  const headers = [];

  for (const tokenMatch of tokenMatches) {
    const splitted = tokenMatch.slice(2, -2).split('|');
    const [token, ...args] = splitted;

    switch (token) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        assert(args.length === 2);
        
        headers.push({
          id: args[0],
          text: args[1],
          level: token.slice(1),
        });
      default:
        continue;
    }
  }

  if (headers.length === 0) {
    return '';
  }

  return trimTemplateString(`
    <ul>
      ${headers.map(header => `
        <li style="margin-left: ${Math.max(header.level - 3, 0) * 20}px"><a href="#${header.id}">${header.text}</a></li>
      `).join('\n')}
    </ul>
  `);
}

const trimTemplateString = (input) => input.split('\n').map(line => line.trimStart()).join('\n');

const getBlogPageTitle = ({ filePath }) => {
  if (!filePath.endsWith('.md')) {
    return '';
  }

  const prefix = '## ';
  try {
    const { stdout: header } = $.sync`grep -m 1 ${prefix} ${filePath}`;
    return header.replace(prefix, '').trim();
  } catch (e) {
    if (e instanceof ProcessOutput) {
      throw new Error(`Error encountered in grepping for header ## in file ${filePath}`);
    }

    throw e;
  }
}

const mdToHtml = async ({ content, filePath }) => {
  if (filePath.endsWith('.md')) {
    const p = $`comrak --syntax-highlighting none --unsafe --gfm`;
    p.stdin.write(content);
    p.stdin.end();
    return await p.then(r => r.stdout);
  } else {
    return content;
  }
}

await build();