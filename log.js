import chalk from 'chalk';

export const log = {
    info: (...args) => console.log(chalk.blue('ℹ'), ...args),
    success: (...args) => console.log(chalk.green('✓'), ...args),
    warn: (...args) => console.log(chalk.yellow('⚠'), ...args),
    error: (...args) => console.error(chalk.red('✖'), ...args),
    step: (step, ...args) => console.log(chalk.cyan(`[${step}]`), ...args),
    url: (url) => console.log(chalk.underline.blue(url)),
    divider: () => console.log(chalk.dim('─'.repeat(40))),
    title: (text) => {
        console.log('\n' + chalk.bold(text));
        log.divider();
    },
    debug: (...args) => console.error(
        chalk.gray('DEBUG:'),
        chalk.gray(new Date().toISOString()),
        ...args.map(arg =>
            typeof arg === 'object'
                ? JSON.stringify(arg, null, 2)
                : arg
        )
    )
};

// Helper functions for styling text without logging
export const style = {
    bold: (text) => chalk.bold(text),
    cyan: (text) => chalk.cyan(text),
    gray: (text) => chalk.gray(text),
    green: (text) => chalk.green(text),
    red: (text) => chalk.red(text),
    yellow: (text) => chalk.yellow(text),
    blue: (text) => chalk.blue(text),
    underline: (text) => chalk.underline(text)
};