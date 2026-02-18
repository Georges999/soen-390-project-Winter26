const normalizeText = (text = "") => text.toLowerCase().replace(/[^a-z0-9]/g, "");

//Used so speech/UI gets clean text instead of raw HTML
const stripHtml = (html = "") => html.replace(/<[^>]+>/g, "");

export { normalizeText, stripHtml };
