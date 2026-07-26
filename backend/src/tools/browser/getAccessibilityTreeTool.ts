import { z } from "zod";
import { tool } from "langchain";
import { browserManager } from "@/browser/BrowserManager"

interface DOMNode {
    tag: string;
    role: string;
    name: string;
    value: string;
    placeholder: string;
    type: string;
    href: string;
    disabled: boolean;
    checked: boolean;
    selected: boolean;
    level: number;
    children: DOMNode[];
}
async function buildDOMTree(page: import("playwright").Page, rootSelector?: string){
    const rawTree = await page.evaluate((sel) => {
        function getRole(el: Element): string {
            const explicit = el.getAttribute("role");
            if (explicit) return explicit;
            const tag = el.tagName.toLowerCase();
            const type = (el as HTMLInputElement).type?.toLowerCase() ?? "";

            const map: Record<string, string> = {
                a: "link",
                button: "button",
                select: "combobox",
                textarea: "textbox",
                nav: "navigation",
                main: "main",
                header: "banner",
                footer: "contentinfo",
                form: "form",
                h1: "heading",
                h2: "heading",
                h3: "heading",
                h4: "heading",
                h5: "heading",
                h6: "heading",
                li: "listitem",
                ul: "list",
                ol: "list",
                article: "article",
                img: "img",
                svg: "img",
            };
            if (tag === "input") {
                const typeMap: Record<string, string> = {
                    checkbox: "checkbox",
                    radio: "radio",
                    submit: "button",
                    search: "searchbox",
                    email: "textbox",
                    password: "textbox",
                    text: "textbox",
                    tel: "textbox",
                    number: "spinbutton",
                    rangle: "slider",
                };
                return typeMap[type] ?? "textbox";
            }
            return map[tag] ?? "";

        }
        function getName(el: Element): string {
            return (
                el.getAttribute("aria-label") ||
                el.getAttribute("placeholder") ||
                el.getAttribute("title") ||
                el.getAttribute("alt") ||
                (el as HTMLElement).innerText?.trim().slice(0, 60) ||
                el.getAttribute("name") ||
                ""
            )
        }
        function walkDOM(el: Element, depth: number): object | null {
            const tag = el.tagName.toLowerCase();
            if (["script", "style", "noscript", "meta", "link"].includes(tag)) return null;
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden" || (el as HTMLElement).hidden) return null;
            const role = getRole(el)
            const name = getName(el);
            const inp = el as HTMLInputElement;
            return {
                tag, role, name,
                value: inp.value ?? "",
                placeholder: inp.placeholder ?? "",
                type: inp.type ?? "",
                href: (el as HTMLAnchorElement).href ?? "",
                disabled: inp.disabled ?? false,
                checked: inp.checked ?? false,
                selected: (el as HTMLOptionElement).selected ?? false,
                level: parseInt(el.getAttribute("aria-level") || "0", 10),
                children: Array.from(el.children)
                    .map(c => walkDOM(c as Element, depth + 1))
                    .filter(Boolean) as any,
            };
        }
        const root = sel ? document.querySelector(sel) : document.body;
        if (!root) return null;
        return walkDOM(root, 0);
    }, rootSelector ?? null) as DOMNode | null;
}

export const getAccessibilityTreeTool = tool(
    async ({ region }) => {
        try {
            const page = browserManager.getPage();
            const url = page.url();
            const title = await page.title();
            const tree = await buildDOMTree(page, region);
            return [
                `Page: "${title}" (${url})`,
                "-".repeat(60),
                tree,
                "-".repeat(60),
                "Use role/name to build selectors for click/type tools.",
            ].join("\n");
        } catch (error) {
            return `Error: ${String(error)}`;
        }
    },
    {
        name: "get_accessibility_tree",
        description: "PRIMARY page inspector. Dumps DOM tree with roles, names, values, and states - every button, input",
        schema: z.object({
            region: z.string().optional().describe("CSS selector to scope the tree (eg 'form', 'nav', '#checkout-form')")
        }),
    }
)
