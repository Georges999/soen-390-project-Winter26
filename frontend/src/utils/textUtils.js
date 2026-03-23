const normalizeText = (text = "") => text.toLowerCase().replaceAll(/[^a-z0-9]/g, "");

//Used so speech/UI gets clean text instead of raw HTML
const stripHtml = (html = "") => html.replaceAll(/<[^>]+>/g, "");

export { normalizeText, stripHtml };
