import { $, chalk, fs, glob, path } from "zx";

const build = async () => {
  const target = './build';
  const pages = await glob('./src/pages/**/*.{html,md}')
  const template = await fs.readFile('src/template.html', 'utf-8');

  for (const pagePath of pages) {
    const fileName = pagePath.replace('./src/pages/', '').replace('.md', '.html');
    const dir = `${target}/${path.dirname(fileName)}`;

    await $`mkdir -p ${dir}`;

    const content = await fs.readFile(pagePath, 'utf-8');
    const withParsedTokens = replaceTokens({ content, filePath: pagePath });
    const withHtml = await mdToHtml({ content: withParsedTokens, filePath: pagePath });
    const withTemplate = template.replace('{{page}}', () => withHtml); // fn to avoid $& replacement pattern
    const final = replaceTokens({ content: withTemplate, filePath: pagePath });

    await fs.writeFile(path.join(target, fileName), final, 'utf-8');

    console.log(`${chalk.green.bold('Build')} ${pagePath}`);
  }

  await $`mkdir -p ./build/assets`;
  await $`cp -r ./src/assets/* ./build/assets`;
  console.log(`${chalk.green.bold('Copy')} assets`);
}

const replaceTokens = ({ content, filePath }) => {
  return content.replace(/\{\{.*?\}\}/g, (value) => {
    const splitted = value.slice(2, -2).split('|');
    const [token, ...args] = splitted;

    switch (token) {
      case 'date': 
        if (args.length === 0) {
          return getFileDate(filePath);
        } else {
          return getFileDate(
            path.join(path.dirname(filePath), args[0])
          );
        }
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
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

const getHeader = (level, id, text) => {
  return `<${level} id="${id}"><a href="#${id}">#</a>${text}</${level}>`
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