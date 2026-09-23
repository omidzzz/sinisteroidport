/**
 * Self-contained SVG snapshot of a mounted lab plate.
 *
 * We clone the stage root element (which contains the <style>),
 * preserving the original stylesheet and DOM structure.
 */
export async function buildPropSvgMarkup(stage: HTMLElement): Promise<string | null> {
  const root = stage.querySelector("[class*=\"-root\"], svg, [style]") as HTMLElement | null;
  if (!root) return null;

  const target = root.tagName === "svg" ? root : root.querySelector("svg");
  if (!target || !(target instanceof SVGSVGElement)) return null;

  const box = target.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) {
    return new Promise<string | null>((resolve) => {
      requestAnimationFrame(() => {
        const retryBox = target.getBoundingClientRect();
        if (retryBox.width > 0 && retryBox.height > 0) {
          resolve(buildSvgMarkup(root, target, retryBox));
        } else {
          resolve(null);
        }
      });
    });
  }

  return buildSvgMarkup(root, target, box);
}

function buildSvgMarkup(root: HTMLElement, svg: SVGSVGElement, box: DOMRect): string | null {
  const clone = root.cloneNode(true) as HTMLElement;
  const svgClone = clone.querySelector("svg") as SVGSVGElement | null;
  if (!svgClone) return null;

  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    svgClone.setAttribute("viewBox", viewBox);
  }

  svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svgClone.setAttribute("width", String(Math.max(1, Math.round(box.width || 320))));
  svgClone.setAttribute("height", String(Math.max(1, Math.round(box.height || 320))));
  svgClone.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const styleEls = root.querySelectorAll("style");
  let combinedStyle = "";
  styleEls.forEach((el) => {
    if (el.textContent) combinedStyle += el.textContent + "\n";
  });

  const names = new Set<string>();
  const scan = (text: string | null) => {
    if (!text) return;
    for (const m of text.matchAll(/var\(\s*(--[\w-]+)/g)) names.add(m[1]);
  };

  combinedStyle.split("\n").forEach((line) => scan(line));
  scan(svg.getAttribute("style"));
  for (const el of svg.querySelectorAll("[style]")) scan(el.getAttribute("style"));

  const cs = getComputedStyle(root);
  let vars = "";
  for (const name of names) {
    const value = cs.getPropertyValue(name).trim();
    if (value) vars += `${name}:${value};`;
  }

  if (vars) {
    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleEl.textContent = combinedStyle + `\n${root.tagName.toLowerCase()}{${vars}}\n`;
    const existingStyle = clone.querySelector("style");
    if (existingStyle) {
      existingStyle.textContent = styleEl.textContent;
    } else {
      clone.insertBefore(styleEl, clone.firstChild);
    }
  }

  return new XMLSerializer().serializeToString(clone);
}

export function downloadText(text: string, filename: string, mime: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return true;
  } catch {
    return false;
  }
}
