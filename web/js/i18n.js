// Interface text in English and Chinese. DOM-free except applyTranslations, so it can be tested in Node.
// Only the interface is translated: JB letters, move notation and face names (U, F, UFR...) stay as they are.

export const LANGUAGES = ['en', 'zh'];
export const LANG_KEY = 'bld-trainer:lang';

export const STRINGS = {
  en: {
    'page.title': '3BLD Memo Trainer',
    'page.description': '3BLD blindfolded memo trainer for the JB letter scheme: scrambles, memo checking, memo-split timer and statistics.',
    'header.title': '3BLD Memo Trainer',
    'header.subtitle': 'JB letter scheme · edge buffer UF · corner buffer UFL',
    'header.credit.before': 'Based on the tutorial',
    'header.credit.after': '(Bilibili)',
    'lang.switch': '中文',
    'lang.switchLabel': 'Switch to Chinese',

    'scramble.heading': 'Scramble',
    'scramble.hint': 'Scramble with <strong>white top, green front</strong>, then memo holding <strong>green top, red front</strong>.',
    'scramble.new': 'New scramble',
    'scramble.retry': 'Try again',
    'scramble.own': 'Enter my own',
    'scramble.ownLabel': 'Scramble (WCA hold)',
    'scramble.use': 'Use',
    'scramble.solvedCube': '(solved cube)',

    'timer.heading': 'Timer',
    'timer.memo': 'memo',
    'timer.exec': 'execution',
    'timer.status.idle': 'Hold space (or touch the timer) and release to start memo.',
    'timer.status.memo': 'Memorising… you can type and check your memo below. Blindfold on, then hold and release space / the timer to start solving. Esc cancels.',
    'timer.status.exec': 'Solving… press space / tap the timer to stop. Esc cancels.',
    'timer.status.done': 'Stopped. Enter the memo you used, then save as Solved or DNF. Esc discards.',
    'timer.armed.idle': 'Release to start memo.',
    'timer.armed.memo': 'Release to start solving.',
    'timer.blocked.saved': 'Attempt saved. Use Try again to redo this scramble, or get a new one.',
    'timer.blocked.answer': 'The answer for this scramble has been shown. Use Try again to redo it, or get a new scramble.',
    'timer.cancelled': 'Attempt cancelled; nothing saved. {idle}',
    'timer.savedNote': 'Saved attempt #{n}. Try again, or get a new scramble for the next one.',

    'memo.heading': 'Your memo',
    'memo.edges': 'Edges',
    'memo.corners': 'Corners',
    'memo.edgesPlaceholder': 'e.g. HE PK JZ CM RW',
    'memo.cornersPlaceholder': 'e.g. YG MJ QS',
    'memo.hint': 'Case, brackets and spaces are ignored.',
    'memo.check': 'Check',
    'memo.reveal': 'Show answer',
    'memo.saveAs': 'Save attempt as:',
    'memo.solved': 'Solved',
    'memo.dnf': 'DNF',

    'result.checkInput': 'Check your input',
    'result.correct': 'Memo correct!',
    'result.parity': 'parity',
    'result.correctMemo': 'Blindfold on and start solving when ready.',
    'result.correctIdle': 'You can now time this scramble.',
    'result.wrong': 'Memo wrong',
    'result.wrongMemo': 'Fix your memo and check again.',
    'result.wrongIdle': 'Fix your memo and check again, or use Show answer to see the reference memo.',
    'result.showWrong': "Show what's wrong",
    'result.answer': 'Answer (not scored)',
    'result.attempt': 'Attempt #{n}: {result}',
    'result.total': 'Total',
    'result.memo': 'Memo',
    'result.exec': 'Execution',
    'result.memoCheckCorrect': 'Memo check: correct.',
    'result.memoCheckWrong': 'Memo check: wrong.',
    'result.showReference': 'Show reference memo',
    'result.solvedPart': '(solved)',

    'cube.heading': 'Cube',
    'cube.view': 'View',
    'cube.net': 'Net',
    'cube.stickers': 'Stickers',
    'cube.colours': 'Colours',
    'cube.letters': 'Letters',
    'cube.state': 'State',
    'cube.scramble': 'Scramble',
    'cube.solved': 'Solved (scheme)',
    'cube.resetView': 'Reset view',
    'cube.dragHint': 'Drag or swipe to rotate.',

    'stats.heading': 'Statistics & history',
    'stats.attempts': 'Attempts',
    'stats.solvedCount': '{n} solved',
    'stats.successRate': 'Success rate',
    'stats.best': 'Best',
    'stats.bestOf': 'best {time}',
    'stats.memoAccuracy': 'Memo accuracy',
    'stats.exportJson': 'Export JSON',
    'stats.exportCsv': 'Export CSV',
    'stats.importJson': 'Import JSON',
    'stats.clear': 'Clear history',
    'stats.empty': 'No timed attempts yet. Use the timer above, then save as Solved or DNF.',
    'stats.col.result': 'Result',
    'stats.col.total': 'Total',
    'stats.col.memo': 'Memo',
    'stats.col.exec': 'Execution',
    'stats.col.check': 'Memo check',
    'stats.col.date': 'Date',
    'stats.col.details': 'Details',
    'stats.show': 'Show',
    'stats.correct': 'correct',
    'stats.wrong': 'wrong',
    'stats.d.scramble': 'Scramble',
    'stats.d.yourEdges': 'Your edges',
    'stats.d.yourCorners': 'Your corners',
    'stats.d.refEdges': 'Ref. edges',
    'stats.d.refCorners': 'Ref. corners',
    'stats.saveBlocked': 'Your browser blocked saving, so history will be lost on reload. Export to keep it.',
    'stats.confirmImport': 'Replace your {count} saved attempts with {n} from {file}?',
    'stats.imported': 'Imported {n} attempts from {file}.',
    'stats.importFailed': 'Import failed: {error}.',
    'stats.confirmClear': 'Delete all {n} saved attempts? Export first if you want to keep them.',
    'stats.cleared': 'History cleared.',

    'feedback.heading': 'Feedback',
    'feedback.intro': 'Found a bug, a memo the checker got wrong, or have an idea? Tell me here.',
    'feedback.message': 'Message',
    'feedback.messagePlaceholder': 'What happened, or what could be better?',
    'feedback.contact': 'Contact (optional)',
    'feedback.contactPlaceholder': 'Email or WeChat, if you want a reply',
    'feedback.attach': 'Attach the current scramble and memo (helps me debug)',
    'feedback.send': 'Send feedback',
    'feedback.sending': 'Sending…',
    'feedback.sent': 'Thanks! Your feedback was sent.',
    'feedback.empty': 'Please write a message first.',
    'feedback.tooLong': 'Please keep the message under {n} characters.',
    'feedback.failed': "Couldn't send feedback ({error}). Check your connection and try again.",
    'feedback.notSetUp': 'Feedback is not set up on this copy of the site yet.',
    'feedback.privacy': 'Visits are counted anonymously (no cookies, no personal data).',

    'err.letter': "'{ch}' is not {article} {kind} letter in the JB scheme",
    'err.leaves': '{kind}: memo leaves {pieces} unsolved',
    'err.move': "Unsupported move: '{move}'",
    'kind.edge': 'edge',
    'kind.corner': 'corner',
    'kind.Edges': 'Edges',
    'kind.Corners': 'Corners',
    'punct.colon': ': ',
  },

  zh: {
    'page.title': '三阶盲拧记忆训练器',
    'page.description': 'JB 字母编码的三阶盲拧记忆训练器：打乱、记忆检查、分段计时和成绩统计。',
    'header.title': '三阶盲拧记忆训练器',
    'header.subtitle': 'JB 字母编码 · 棱块缓冲 UF · 角块缓冲 UFL',
    'header.credit.before': '参考教程',
    'header.credit.after': '（哔哩哔哩）',
    'lang.switch': 'English',
    'lang.switchLabel': '切换到英文',

    'scramble.heading': '打乱',
    'scramble.hint': '按<strong>白顶绿前</strong>打乱，然后按<strong>绿顶红前</strong>拿魔方记忆。',
    'scramble.new': '新打乱',
    'scramble.retry': '再试一次',
    'scramble.own': '输入自己的打乱',
    'scramble.ownLabel': '打乱公式（WCA 朝向）',
    'scramble.use': '使用',
    'scramble.solvedCube': '（已复原）',

    'timer.heading': '计时器',
    'timer.memo': '记忆',
    'timer.exec': '执行',
    'timer.status.idle': '按住空格（或按住计时器）然后松开，开始记忆。',
    'timer.status.memo': '记忆中… 可以在下面输入并检查编码。戴上眼罩后，按住再松开空格 / 计时器开始还原。Esc 取消。',
    'timer.status.exec': '还原中… 按空格 / 点计时器停止。Esc 取消。',
    'timer.status.done': '已停止。输入你用的编码，然后保存为“成功”或“DNF”。Esc 放弃。',
    'timer.armed.idle': '松开开始记忆。',
    'timer.armed.memo': '松开开始还原。',
    'timer.blocked.saved': '成绩已保存。点“再试一次”重做这个打乱，或换一个新打乱。',
    'timer.blocked.answer': '这个打乱的答案已经显示过了。点“再试一次”重做，或换一个新打乱。',
    'timer.cancelled': '已取消，没有保存。{idle}',
    'timer.savedNote': '已保存第 {n} 次成绩。再试一次，或换一个新打乱继续。',

    'memo.heading': '你的编码',
    'memo.edges': '棱块',
    'memo.corners': '角块',
    'memo.edgesPlaceholder': '例如 HE PK JZ CM RW',
    'memo.cornersPlaceholder': '例如 YG MJ QS',
    'memo.hint': '不区分大小写，括号和空格会被忽略。',
    'memo.check': '检查',
    'memo.reveal': '显示答案',
    'memo.saveAs': '保存成绩为：',
    'memo.solved': '成功',
    'memo.dnf': 'DNF',

    'result.checkInput': '请检查输入',
    'result.correct': '编码正确！',
    'result.parity': '奇偶',
    'result.correctMemo': '戴上眼罩，准备好就开始还原。',
    'result.correctIdle': '现在可以给这个打乱计时了。',
    'result.wrong': '编码错误',
    'result.wrongMemo': '修改编码后再检查一次。',
    'result.wrongIdle': '修改编码后再检查一次，或点“显示答案”查看参考编码。',
    'result.showWrong': '查看错在哪里',
    'result.answer': '答案（不计成绩）',
    'result.attempt': '第 {n} 次：{result}',
    'result.total': '总时间',
    'result.memo': '记忆',
    'result.exec': '执行',
    'result.memoCheckCorrect': '编码检查：正确。',
    'result.memoCheckWrong': '编码检查：错误。',
    'result.showReference': '查看参考编码',
    'result.solvedPart': '（已复原）',

    'cube.heading': '魔方',
    'cube.view': '视图',
    'cube.net': '展开图',
    'cube.stickers': '贴纸',
    'cube.colours': '颜色',
    'cube.letters': '字母',
    'cube.state': '状态',
    'cube.scramble': '打乱',
    'cube.solved': '复原（编码表）',
    'cube.resetView': '重置视角',
    'cube.dragHint': '拖动或滑动来旋转。',

    'stats.heading': '统计和历史',
    'stats.attempts': '次数',
    'stats.solvedCount': '成功 {n} 次',
    'stats.successRate': '成功率',
    'stats.best': '最好成绩',
    'stats.bestOf': '最好 {time}',
    'stats.memoAccuracy': '编码正确率',
    'stats.exportJson': '导出 JSON',
    'stats.exportCsv': '导出 CSV',
    'stats.importJson': '导入 JSON',
    'stats.clear': '清空历史',
    'stats.empty': '还没有计时成绩。用上面的计时器，然后保存为“成功”或“DNF”。',
    'stats.col.result': '结果',
    'stats.col.total': '总时间',
    'stats.col.memo': '记忆',
    'stats.col.exec': '执行',
    'stats.col.check': '编码检查',
    'stats.col.date': '日期',
    'stats.col.details': '详情',
    'stats.show': '展开',
    'stats.correct': '正确',
    'stats.wrong': '错误',
    'stats.d.scramble': '打乱',
    'stats.d.yourEdges': '你的棱块',
    'stats.d.yourCorners': '你的角块',
    'stats.d.refEdges': '参考棱块',
    'stats.d.refCorners': '参考角块',
    'stats.saveBlocked': '浏览器禁止了保存，刷新后历史会丢失。请先导出保存。',
    'stats.confirmImport': '用 {file} 中的 {n} 条成绩替换你已保存的 {count} 条成绩吗？',
    'stats.imported': '已从 {file} 导入 {n} 条成绩。',
    'stats.importFailed': '导入失败：{error}。',
    'stats.confirmClear': '删除全部 {n} 条成绩吗？如需保留请先导出。',
    'stats.cleared': '历史已清空。',

    'feedback.heading': '反馈',
    'feedback.intro': '发现 bug、检查器判错的编码，或者有什么建议？欢迎在这里告诉我。',
    'feedback.message': '内容',
    'feedback.messagePlaceholder': '遇到了什么问题，或者哪里可以改进？',
    'feedback.contact': '联系方式（选填）',
    'feedback.contactPlaceholder': '邮箱或微信，需要回复的话请填写',
    'feedback.attach': '附上当前的打乱和编码（方便我排查问题）',
    'feedback.send': '发送反馈',
    'feedback.sending': '发送中…',
    'feedback.sent': '谢谢！反馈已发送。',
    'feedback.empty': '请先写点内容。',
    'feedback.tooLong': '内容请不要超过 {n} 个字符。',
    'feedback.failed': '反馈发送失败（{error}）。请检查网络后重试。',
    'feedback.notSetUp': '这个网站副本还没有设置反馈功能。',
    'feedback.privacy': '本站匿名统计访问量（不使用 cookie，不收集个人信息）。',

    'err.letter': '“{ch}”不是 JB 编码中的{kind}字母',
    'err.leaves': '{kind}：编码后 {pieces} 仍未复原',
    'err.move': '不支持的转动：“{move}”',
    'kind.edge': '棱块',
    'kind.corner': '角块',
    'kind.Edges': '棱块',
    'kind.Corners': '角块',
    'punct.colon': '：',
  },
};

/** Fill {name} placeholders. */
function fill(text, vars) {
  return text.replace(/\{(\w+)\}/g, (whole, name) => (name in vars ? String(vars[name]) : whole));
}

/** Text for a key in a language; falls back to English, then to the key itself. */
export function t(lang, key, vars = {}) {
  return fill(STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key, vars);
}

/**
 * Language to use: ?lang= in the URL, then the saved choice, then the browser's language.
 * Anything starting with "zh" (zh-CN, zh-TW...) picks Chinese.
 */
export function pickLanguage({ param = null, saved = null, browser = [] } = {}) {
  for (const choice of [param, saved]) {
    if (LANGUAGES.includes(choice)) return choice;
  }
  return browser.some((code) => /^zh\b/i.test(code)) ? 'zh' : 'en';
}

// Messages produced by memo.js and cube.js are English (they match the Python reference),
// so they are translated by pattern for display
const MESSAGE_PATTERNS = [
  [/^(Edges|Corners): memo leaves (.*) unsolved$/, (lang, [, kind, pieces]) => t(lang, 'err.leaves', {
    kind: t(lang, `kind.${kind}`), pieces,
  })],
  [/^(?:(Edges|Corners): )?'(.*)' is not an? (edge|corner) letter in the JB scheme$/, (lang, [, prefix, ch, kind]) => {
    const text = t(lang, 'err.letter', { ch, kind: t(lang, `kind.${kind}`), article: kind === 'edge' ? 'an' : 'a' });
    return prefix ? `${t(lang, `kind.${prefix}`)}${t(lang, 'punct.colon')}${text}` : text;
  }],
  [/^Unsupported move: '(.*)'$/, (lang, [, move]) => t(lang, 'err.move', { move })],
];

/** Translate a checker or scramble message; unknown messages are returned unchanged. */
export function translateMessage(lang, message) {
  if (lang === 'en') return message;
  for (const [pattern, render] of MESSAGE_PATTERNS) {
    const match = pattern.exec(message);
    if (match) return render(lang, match);
  }
  return message;
}

/**
 * Translate a page: elements marked data-i18n (text), data-i18n-html (trusted markup from STRINGS),
 * data-i18n-placeholder and data-i18n-aria-label.
 */
export function applyTranslations(root, lang) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(lang, el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(lang, el.dataset.i18nHtml);
  for (const el of root.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(lang, el.dataset.i18nPlaceholder);
  for (const el of root.querySelectorAll('[data-i18n-aria-label]')) {
    el.setAttribute('aria-label', t(lang, el.dataset.i18nAriaLabel));
  }
}
