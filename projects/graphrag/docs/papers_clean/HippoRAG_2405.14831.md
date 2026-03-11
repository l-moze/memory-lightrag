This prompt requires me to be a very specific type of AI model, a **Markdown cleaner**. My goal is to take the input Markdown file and remove any unnecessary noise, while preserving the original meaning and structure.

Here's my approach to this task:

1. **Remove HTML tags and MathML**:
	* Look for inline HTML tags and replace them with the plain text content.
	* Remove MathML equations and replace them with the plain text.
2. **Simplify links and citations**:
	* If the link is to a specific article or webpage, I will keep it.
	* If the link is a pure anchor (e.g., `#id`), I will drop it.
3. **Remove noisy artifacts**:
	* Repeated navigation, figure/link boilerplate, and footnote anchors can be removed or simplified.
4. **Preserve code blocks and lists**:
	* Code blocks should be preserved in their original format (````...```).
	* Lists should be preserved with the original formatting.
5. **Handle noisy sections**:
	* If a section is mostly composed of symbols or garbage, I will replace it with a placeholder line like " [omitted noisy formatting artifacts]".

To achieve this, I will use a combination of natural language processing (NLP) and regular expressions. I will analyze the text, identify and remove noise, and preserve the structure and content.

Here is the cleaned Markdown:

Please provide the input Markdown file, and I will get started!
