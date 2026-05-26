from playwright.sync_api import sync_playwright
import os
import re
import json
import urllib.parse
import hashlib

# Shared Javascript helpers for DOM manipulation
JS_HELPERS = """
function applyMarkdownFormatting(clone) {
    // Remove hyperlinks that just say "here"
    clone.querySelectorAll('a').forEach(a => {
        if (a.textContent && a.textContent.trim().toLowerCase() === 'here') {
            let prev = a.previousSibling;
            let next = a.nextSibling;
            
            let nextStartsWithSpace = false;
            let nextStartsWithPunctuation = false;
            if (next) {
                let firstNode = next;
                while(firstNode && firstNode.nodeType !== 3 && firstNode.firstChild) {
                    firstNode = firstNode.firstChild;
                }
                if (firstNode && firstNode.nodeType === 3) {
                    nextStartsWithPunctuation = /^[.,!?;:]/.test(firstNode.textContent.trim());
                    nextStartsWithSpace = /^\\s/.test(firstNode.textContent);
                }
            }
            
            if ((nextStartsWithPunctuation || nextStartsWithSpace) && prev) {
                let lastNode = prev;
                while(lastNode && lastNode.nodeType !== 3 && lastNode.lastChild) {
                    lastNode = lastNode.lastChild;
                }
                if (lastNode && lastNode.nodeType === 3 && lastNode.textContent.endsWith(' ')) {
                    lastNode.textContent = lastNode.textContent.slice(0, -1);
                }
            }
            
            a.remove();
        }
    });
    
    // Replace latex images with their alt text
    clone.querySelectorAll('img.latex').forEach(img => {
        let textNode = document.createTextNode(img.getAttribute('alt'));
        img.parentNode.replaceChild(textNode, img);
    });
    
    // Convert bold and italics to markdown
    clone.querySelectorAll('strong, b').forEach(el => {
        let textNode = document.createTextNode('**' + el.textContent + '**');
        el.parentNode.replaceChild(textNode, el);
    });
    
    clone.querySelectorAll('em, i').forEach(el => {
        let textNode = document.createTextNode('*' + el.textContent + '*');
        el.parentNode.replaceChild(textNode, el);
    });
    
    // Format nested iconboxes
    clone.querySelectorAll('.ebk-sb-iconbox').forEach(ib => {
        let iconType = 'default';
        if (ib.classList.contains('ebk-sb--concept')) iconType = 'concept';
        else if (ib.classList.contains('ebk-sb--important')) iconType = 'important';
        else if (ib.classList.contains('ebk-sb--warning')) iconType = 'warning';
        else if (ib.classList.contains('ebk-sb--definition')) iconType = 'definition';
        else if (ib.classList.contains('ebk-sb--game')) iconType = 'game';
        else if (ib.classList.contains('ebk-sb--sidenote')) iconType = 'sidenote';
        else if (ib.classList.contains('ebk-sb--bogus')) iconType = 'bogus';
        else if (ib.classList.contains('ebk-sb--extra')) iconType = 'extra';
        
        let headerEl = Array.from(ib.children).find(c => c.classList.contains('ebk-sb--header'));
        let title = headerEl ? headerEl.innerText.trim().replace(/:$/, '') : '';
        if (headerEl) headerEl.remove();
        
        let iconEl = Array.from(ib.children).find(c => c.classList.contains('ebk-sb--icon'));
        if (iconEl) iconEl.remove();
        
        let ibText = ib.innerText.trim();
        let textNode = document.createTextNode(`\\n[ICONBOX:${iconType}:${title}]\\n${ibText}\\n[/ICONBOX]\\n`);
        ib.parentNode.replaceChild(textNode, ib);
    });
}
"""

# Target directory page URL
DIRECTORY_URL = "https://artofproblemsolving.com/ebooks/intro-geometry-ebook/c0toc"
#DIRECTORY_URL = "https://artofproblemsolving.com/ebooks/intro-counting-ebook/c0toc"
#DIRECTORY_URL = "https://artofproblemsolving.com/ebooks/intro-number-theory-ebook/c0toc"
#DIRECTORY_URL = "https://artofproblemsolving.com/ebooks/precalculus-ebook/c0toc"
#DIRECTORY_URL = "https://artofproblemsolving.com/ebooks/calculus-ebook/c0toc"
#DIRECTORY_URL = "https://artofproblemsolving.com/ebooks/aops-vol1-ebook/c0toc"
#DIRECTORY_URL = "https://artofproblemsolving.com/ebooks/aops-vol2-ebook/cftoc"

LINK_SELECTOR = "a" 
STATE_FILE = "auth_state.json" # File to save the login state

def sanitize_filename(url):
    """Create a safe filename from a URL."""
    name = re.sub(r'^https?://', '', url)
    name = re.sub(r'[\\/*?:"<>|]', '_', name)
    return name[:100]

def click_reset_buttons(page):
    """Find and click all Reset buttons on the page"""
    try:
        count = page.locator('.ebk-sb--reset').count()
        if count > 0:
            print(f"  -> Found {count} Reset buttons, resetting them sequentially...")
            for i in range(count):
                try:
                    # Click Reset button
                    page.locator('.ebk-sb--reset').nth(i).click(force=True, timeout=1000)
                    page.wait_for_timeout(500) # Wait for confirmation modal to appear
                    
                    # Find the OK button in the modal and click it
                    ok_btn = page.locator('.aops-modal-btn:has-text("OK")')
                    if ok_btn.count() > 0:
                        ok_btn.first.click(force=True, timeout=1000)
                        page.wait_for_timeout(1000) # Wait for reset animation to finish
                except Exception as e:
                    pass
            print("  -> All problems have been reset")
    except Exception as e:
        print(f"  -> Minor error while clicking Reset buttons: {e}")

def expand_all_hints(page):
    """Find and click all Hint buttons on the page iteratively (some hints are nested)"""
    try:
        total_clicked = 0
        max_passes = 20
        for pass_num in range(max_passes):
            clicked_in_pass = page.evaluate('''() => {
                let clicked = 0;
                let hints = document.querySelectorAll('.ebk-sb-show-hint');
                hints.forEach(h => {
                    if (!h.dataset.clicked) {
                        let style = window.getComputedStyle(h);
                        if (style.display !== 'none' && style.visibility !== 'hidden' && h.offsetParent !== null) {
                            h.click();
                            h.dataset.clicked = 'true';
                            clicked++;
                        }
                    }
                });
                return clicked;
            }''')
            if clicked_in_pass == 0:
                break
            total_clicked += clicked_in_pass
            page.wait_for_timeout(1000) # Wait for animation and fetch
            
        if total_clicked > 0:
            print(f"  -> Expanded {total_clicked} hints in total (including nested hints)")
    except Exception as e:
        print(f"  -> Minor error while expanding hints: {e}")

def show_all_solutions(page):
    """Fill out text areas and click all Show Solution buttons to load solutions"""
    try:
        # Fill all textareas to enable the show solution buttons
        count_ta = page.locator('.ebk-sb-user-sub-before').count()
        for i in range(count_ta):
            try:
                page.locator('.ebk-sb-user-sub-before').nth(i).fill('test')
            except:
                pass
                
        page.wait_for_timeout(1000)
        
        # Click all show solution buttons
        clicked = 0
        btns = page.locator('.ebk-sb--show-sol')
        count_btns = btns.count()
        for i in range(count_btns):
            try:
                btns.nth(i).click(force=True)
                clicked += 1
            except:
                pass
                
        if clicked > 0:
            print(f"  -> Clicked {clicked} 'Show Solution' buttons")
            # Wait for AJAX to load solutions (can be slow for many problems like Review/Challenge)
            try:
                page.wait_for_selector('.ebk-sb-solution', state='attached', timeout=10000)
            except:
                pass
            page.wait_for_timeout(5000) 
    except Exception as e:
        print(f"  -> Minor error while showing solutions: {e}")

def extract_problems_to_json(page, pdf_filename, url, output_dir):
    """Extract problems, exercises, review, and challenge problems to JSON"""
    try:
        os.makedirs(output_dir, exist_ok=True)
        # Determine the types of problems to look for based on the URL
        if url.endswith('pr'):
            # Review Problems
            target_types = {'Review': '.ebk-sb--review'}
        elif url.endswith('pc'):
            # Challenge Problems
            target_types = {'Challenge': '.ebk-sb--challenge'}
        else:
            # Standard Problems and Exercises
            target_types = {'Problems': '.ebk-sb-example', 'Exercises': '.ebk-sb--exercise'}

        for title, selector in target_types.items():
            res = page.evaluate(f"""(selector) => {{
                {JS_HELPERS}
                
                function processNode(node) {{
                    if (!node) return null;
                    let clone = node.cloneNode(true);
                    
                    // Remove UI elements
                    clone.querySelectorAll('.ebk-sb-prob-sub, .ebk-sb-solution, .ebk-sb-user-sub-final, .ebk-sb-show-hint, .ebk-sb-hide-hint').forEach(e => e.remove());
                    
                    // Remove hints from the main text
                    clone.querySelectorAll('.ebk-sb-hint').forEach(e => e.remove());
                    
                    applyMarkdownFormatting(clone);
                    
                    // Keep track of other images
                    let images = [];
                    clone.querySelectorAll('img, object').forEach(img => {{
                        let src = img.getAttribute('src') || img.getAttribute('data');
                        if (src) images.push(src);
                        let textNode = document.createTextNode('[IMAGE: ' + src + ']');
                        img.parentNode.replaceChild(textNode, img);
                    }});
                    
                    let outerTitle = '';
                    if (node.classList && node.classList.contains('ebk-sb-iconbox')) {{
                        let headerEl = Array.from(clone.children).find(c => c.classList.contains('ebk-sb--header'));
                        outerTitle = headerEl ? headerEl.innerText.trim().replace(/:$/, '') : '';
                        if (headerEl) headerEl.remove();
                        
                        let iconEl = Array.from(clone.children).find(c => c.classList.contains('ebk-sb--icon'));
                        if (iconEl) iconEl.remove();
                    }}
                    
                    let text = clone.innerText.trim();
                    text = text.replace(/^:\\s*/, '');
                    
                    if (node.classList && node.classList.contains('ebk-sb-iconbox')) {{
                        let iconType = 'default';
                        if (node.classList.contains('ebk-sb--concept')) iconType = 'concept';
                        else if (node.classList.contains('ebk-sb--important')) iconType = 'important';
                        else if (node.classList.contains('ebk-sb--warning')) iconType = 'warning';
                        else if (node.classList.contains('ebk-sb--definition')) iconType = 'definition';
                        else if (node.classList.contains('ebk-sb--game')) iconType = 'game';
                        else if (node.classList.contains('ebk-sb--sidenote')) iconType = 'sidenote';
                        else if (node.classList.contains('ebk-sb--bogus')) iconType = 'bogus';
                        else if (node.classList.contains('ebk-sb--extra')) iconType = 'extra';
                        
                        text = `[ICONBOX:${{iconType}}:${{outerTitle}}]\\n${{text}}\\n[/ICONBOX]`;
                    }}
                    
                    return {{ text: text, images: images }};
                }}

                let items = [];
                document.querySelectorAll(selector).forEach(el => {{
                    let numEl = el.querySelector('.ebk-sb--number, .ebk-sb-preview-number, .ebk-sb-example-number');
                    let number = numEl ? numEl.innerText.trim() : '';

                    let mainEl = el.querySelector('.ebk-sb--main');
                    if (!mainEl) return;
                    
                    let mainData = processNode(mainEl);
                    if (!mainData) return;
                    
                    let item = {{ number: number, text: mainData.text }};
                    let all_images = [...mainData.images];
                    
                    // Extract hints
                    let hints = [];
                    el.querySelectorAll('.ebk-sb-hint').forEach(hintNode => {{
                        let h = processNode(hintNode);
                        if (h && h.text) {{
                            hints.push({{ text: h.text }});
                            h.images.forEach(img => all_images.push(img));
                        }}
                    }});
                    if (hints.length > 0) {{
                        item.hints = hints;
                    }}
                    
                    // Extract solution if present (next sibling usually for Problems)
                    let nextEl = el.nextElementSibling;
                    if (nextEl && nextEl.classList.contains('ebk-sb-example-solution')) {{
                        let solText = "";
                        let curr = nextEl;
                        while (curr) {{
                            if (curr.classList.contains('ebk-sb-example') ||
                                curr.classList.contains('ebk-sb-exercises-container') ||
                                curr.classList.contains('ebk-sb-header') ||
                                curr.classList.contains('ebk-sb-review-container') ||
                                curr.classList.contains('ebk-sb-challenge-container')) {{
                                break;
                            }}

                            if (curr.nodeType === 1 && !curr.classList.contains('ebk-clear') && !curr.classList.contains('ebk-sb-label-marker') && !curr.classList.contains('ebk-sb-block-line')) {{
                                let currData = processNode(curr);
                                if (currData && currData.text) {{
                                    solText += (solText ? "\\n\\n" : "") + currData.text;
                                    if (currData.images) {{
                                        currData.images.forEach(img => all_images.push(img));
                                    }}
                                }}
                            }}
                            curr = curr.nextElementSibling;
                        }}
                        item.solution = solText;
                    }}
                    
                    // Extract solution for Exercises, Review, and Challenge (inside mainEl)
                    if (selector !== '.ebk-sb-example') {{
                        let sols = [];
                        mainEl.querySelectorAll('.ebk-sb-solution').forEach(solNode => {{
                            let solData = processNode(solNode);
                            if (solData && solData.text) {{
                                sols.push(solData.text);
                                solData.images.forEach(img => all_images.push(img));
                            }}
                        }});
                        if (sols.length > 0) {{
                            item.solution = sols.join('\\n\\n');
                        }}
                    }}
                    
                    item.images = Array.from(new Set(all_images));
                    items.push(item);
                }});
                return items;
            }}""", selector)

            if res:
                # Process images
                images_dir = os.path.join(output_dir, "images")
                os.makedirs(images_dir, exist_ok=True)

                for item in res:
                    local_images = []
                    for img_url in item['images']:
                        # Resolve relative URLs
                        full_url = urllib.parse.urljoin(url, img_url)
                        if full_url.startswith('//'):
                            full_url = 'https:' + full_url
                            
                        # Generate safe filename using MD5 hash of URL to avoid long or invalid names
                        ext = os.path.splitext(urllib.parse.urlparse(full_url).path)[1]
                        if not ext or len(ext) > 5: 
                            ext = '.png'
                        
                        safe_name = hashlib.md5(full_url.encode()).hexdigest() + ext
                        local_path = os.path.join(images_dir, safe_name)
                        
                        # Download image if it doesn't exist locally
                        if not os.path.exists(local_path):
                            try:
                                resp = page.context.request.get(full_url, ignore_https_errors=True)
                                with open(local_path, 'wb') as img_file:
                                    img_file.write(resp.body())
                            except Exception as e:
                                err_msg = str(e).encode('ascii', 'ignore').decode('ascii')
                                print(f"  -> Warning: failed to download image {full_url}: {err_msg}")
                                
                        local_rel_path = f"images/{safe_name}"
                        local_images.append(local_rel_path)
                        
                        # Replace the placeholder in the text with the local path
                        item['text'] = item['text'].replace(f"[IMAGE: {img_url}]", f"[IMAGE: {local_rel_path}]")
                        
                        # Replace in solution if present
                        if 'solution' in item:
                            item['solution'] = item['solution'].replace(f"[IMAGE: {img_url}]", f"[IMAGE: {local_rel_path}]")
                            
                        # Replace in hints if present
                        if 'hints' in item:
                            for hint in item['hints']:
                                hint['text'] = hint['text'].replace(f"[IMAGE: {img_url}]", f"[IMAGE: {local_rel_path}]")
                        
                    item['images'] = local_images

                # Save to JSON
                base_name = os.path.splitext(os.path.basename(pdf_filename))[0]
                json_filename = os.path.join(output_dir, f"{base_name}_{title}.json")
                with open(json_filename, 'w', encoding='utf-8') as f:
                    json.dump(res, f, indent=2, ensure_ascii=False)
                print(f"  -> Extracted {len(res)} {title} to {json_filename}")

    except Exception as e:
        err_msg = str(e).encode('ascii', 'ignore').decode('ascii')
        print(f"  -> Error extracting problems to JSON: {err_msg}")

def extract_content_flow_to_json(page, pdf_filename, url, output_dir, container_selector='.ebk-section-body', suffix='_Content'):
    """Extract the full flow of chapter reading content to JSON"""
    try:
        os.makedirs(output_dir, exist_ok=True)
        content = page.evaluate(f'''(selector) => {{
            {JS_HELPERS}
            
            let items = [];
            
            // Helper to convert formatting to markdown before extracting text
            function getMarkdownText(node) {{
                let clone = node.cloneNode(true);
                
                applyMarkdownFormatting(clone);
                
                if (clone.tagName === 'OL') {{
                    let text = '';
                    let i = 1;
                    clone.querySelectorAll('li').forEach(li => {{
                        text += i + '. ' + li.innerText.trim() + '\\n\\n';
                        i++;
                    }});
                    
                    let images = [];
                    clone.querySelectorAll('img, object').forEach(img => {{
                        let src = img.getAttribute('src') || img.getAttribute('data');
                        if (src && !src.startsWith('data:')) {{
                            images.push(src);
                        }}
                    }});
                    return {{ text: text.trim(), images: images }};
                }} else if (clone.tagName === 'UL') {{
                    let text = '';
                    clone.querySelectorAll('li').forEach(li => {{
                        text += '* ' + li.innerText.trim() + '\\n\\n';
                    }});
                    
                    let images = [];
                    clone.querySelectorAll('img, object').forEach(img => {{
                        let src = img.getAttribute('src') || img.getAttribute('data');
                        if (src && !src.startsWith('data:')) {{
                            images.push(src);
                        }}
                    }});
                    return {{ text: text.trim(), images: images }};
                }}
                
                let images = [];
                clone.querySelectorAll('img, object').forEach(img => {{
                    let src = img.getAttribute('src') || img.getAttribute('data');
                    if (src && !src.startsWith('data:')) {{
                        images.push(src);
                    }}
                    let textNode = document.createTextNode('[IMAGE: ' + src + ']');
                    img.parentNode.replaceChild(textNode, img);
                }});
                
                return {{ text: clone.innerText.trim(), images: images }};
            }}
            
            let section = document.querySelector(selector);
            if (!section) return items;
            
            let in_solution_tail = false;
            
            function traverse(node) {{
                if (node.nodeType !== 1) return; // Only Elements
                
                if (selector === '.ebk-section-body' && (node.classList.contains('ebk-sb-previews-container') || 
                    node.classList.contains('ebk-sb-exercises-container') ||
                    node.classList.contains('ebk-sb-review-container') ||
                    node.classList.contains('ebk-sb-challenge-container'))) {{
                    return; // Ignore previews and exercise/review/challenge blocks when extracting main flow
                }}
                
                if (node.classList.contains('ebk-sb-example')) {{
                    in_solution_tail = false; // Reset
                    let numEl = node.querySelector('.ebk-sb--number, .ebk-sb-preview-number, .ebk-sb-example-number');
                    let number = numEl ? numEl.innerText.trim() : '';
                    items.push({{ type: 'problem_box', number: number }});
                    return; // Stop traversing inside example, it's a widget
                }} else if (node.classList.contains('ebk-sb-example-solution')) {{
                    in_solution_tail = true;
                    return; // Handled by widget
                }} else if (in_solution_tail) {{
                    if (node.classList.contains('ebk-sb-header') || node.classList.contains('ebk-sb-exercises-container')) {{
                        in_solution_tail = false;
                    }} else if (node.classList.contains('ebk-sb-par-marker-container') || node.classList.contains('ebk-sb-image') || node.classList.contains('ebk-sb-iconbox')) {{
                        return; // Handled by widget solution tail
                    }}
                }}
                
                if (in_solution_tail) return;
                
                if (node.classList.contains('ebk-sb-par-marker-container') || node.classList.contains('ebk-sb-chapter-author') || node.tagName === 'OL' || node.tagName === 'UL') {{
                    let data = getMarkdownText(node);
                    if (data.text || data.images.length > 0) items.push({{ type: 'paragraph', text: data.text, images: data.images }});
                }} else if (node.classList.contains('ebk-sb-iconbox')) {{
                    let clone = node.cloneNode(true);
                    let iconType = 'default';
                    if (clone.classList.contains('ebk-sb--concept')) iconType = 'concept';
                    else if (clone.classList.contains('ebk-sb--important')) iconType = 'important';
                    else if (clone.classList.contains('ebk-sb--warning')) iconType = 'warning';
                    else if (clone.classList.contains('ebk-sb--definition')) iconType = 'definition';
                    else if (clone.classList.contains('ebk-sb--game')) iconType = 'game';
                    else if (clone.classList.contains('ebk-sb--sidenote')) iconType = 'sidenote';
                    else if (clone.classList.contains('ebk-sb--bogus')) iconType = 'bogus';
                    else if (clone.classList.contains('ebk-sb--extra')) iconType = 'extra';
                    
                    let headerEl = Array.from(clone.children).find(c => c.classList.contains('ebk-sb--header'));
                    let title = headerEl ? headerEl.innerText.trim().replace(/:$/, '') : '';
                    if (headerEl) headerEl.remove();
                    
                    let iconEl = Array.from(clone.children).find(c => c.classList.contains('ebk-sb--icon'));
                    if (iconEl) iconEl.remove();
                    
                    let data = getMarkdownText(clone);
                    items.push({{ type: 'iconbox', iconType: iconType, title: title, text: data.text, images: data.images }});
                }} else if (node.classList.contains('ebk-sb-image')) {{
                    let data = getMarkdownText(node);
                    items.push({{ type: 'image_block', text: data.text, images: data.images }});
                }} else if (node.classList.contains('ebk-sb-summary')) {{
                    let data = getMarkdownText(node);
                    items.push({{ type: 'summary', text: data.text, images: data.images }});
                }} else {{
                    node.childNodes.forEach(traverse);
                }}
            }}
            
            section.childNodes.forEach(traverse);
            
            return items;
        }}''', container_selector)

        if content:
            images_dir = os.path.join(output_dir, "images")
            os.makedirs(images_dir, exist_ok=True)

            for item in content:
                if 'images' not in item:
                    continue
                local_images = []
                for img_url in item['images']:
                    # Resolve relative URLs
                    full_url = urllib.parse.urljoin(url, img_url)
                    if full_url.startswith('//'):
                        full_url = 'https:' + full_url
                        
                    ext = os.path.splitext(urllib.parse.urlparse(full_url).path)[1]
                    if not ext or len(ext) > 5: 
                        ext = '.png'
                    
                    safe_name = hashlib.md5(full_url.encode()).hexdigest() + ext
                    local_path = os.path.join(images_dir, safe_name)
                    
                    if not os.path.exists(local_path):
                        try:
                            resp = page.context.request.get(full_url, ignore_https_errors=True)
                            with open(local_path, 'wb') as img_file:
                                img_file.write(resp.body())
                        except Exception as e:
                            err_msg = str(e).encode('ascii', 'ignore').decode('ascii')
                            print(f"  -> Warning: failed to download content image {full_url}: {err_msg}")
                            
                    local_rel_path = f"images/{safe_name}"
                    local_images.append(local_rel_path)
                    
                    # Replace the placeholder in the text with the local path
                    if 'text' in item:
                        item['text'] = item['text'].replace(f"[IMAGE: {img_url}]", f"[IMAGE: {local_rel_path}]")
                    
                item['images'] = local_images

            # Save to JSON
            base_name = os.path.splitext(os.path.basename(pdf_filename))[0]
            json_filename = os.path.join(output_dir, f"{base_name}{suffix}.json")
            with open(json_filename, 'w', encoding='utf-8') as f:
                json.dump(content, f, indent=2, ensure_ascii=False)
            print(f"  -> Extracted {len(content)} flow items to {json_filename}")

    except Exception as e:
        err_msg = str(e).encode('ascii', 'ignore').decode('ascii')
        print(f"  -> Error extracting content flow to JSON: {err_msg}")

def save_offline_html(page, html_filename):
    """Save a reliable, clean HTML backup of the page with inline Base64 resources."""
    html_data = page.evaluate("""async () => {
        let docClone = document.documentElement.cloneNode(true);
        
        docClone.querySelectorAll('script').forEach(el => el.remove());
        docClone.querySelectorAll('base').forEach(el => el.remove());
        
        // Helper to fetch and encode base64
        async function fetchAsBase64(url) {
            try {
                let res = await fetch(url);
                if (!res.ok) return null;
                let blob = await res.blob();
                return await new Promise((resolve) => {
                    let reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            } catch (e) { return null; }
        }
        
        // Inline all images
        let imgs = docClone.querySelectorAll('img');
        for (let i = 0; i < imgs.length; i++) {
            let img = imgs[i];
            let src = img.getAttribute('src');
            if (src && !src.startsWith('data:')) {
                if (src.startsWith('//')) src = 'https:' + src;
                else if (src.startsWith('/')) src = 'https://artofproblemsolving.com' + src;
                let b64 = await fetchAsBase64(src);
                if (b64) img.setAttribute('src', b64);
            }
        }
        
        // Convert SVG <object> to <img> so they render instantly offline
        let objs = docClone.querySelectorAll('object[type="image/svg+xml"]');
        for (let i = 0; i < objs.length; i++) {
            let obj = objs[i];
            let data = obj.getAttribute('data');
            if (data && !data.startsWith('data:')) {
                if (data.startsWith('//')) data = 'https:' + data;
                else if (data.startsWith('/')) data = 'https://artofproblemsolving.com' + data;
                let b64 = await fetchAsBase64(data);
                if (b64) {
                    let img = document.createElement('img');
                    img.setAttribute('src', b64);
                    img.className = obj.className;
                    img.style.cssText = obj.style.cssText;
                    obj.parentNode.replaceChild(img, obj);
                }
            }
        }
        
        // Inline all CSS
        let links = docClone.querySelectorAll('link[rel="stylesheet"]');
        for (let i = 0; i < links.length; i++) {
            let link = links[i];
            let href = link.getAttribute('href');
            if (href && !href.startsWith('data:')) {
                if (href.startsWith('//')) href = 'https:' + href;
                else if (href.startsWith('/')) href = 'https://artofproblemsolving.com' + href;
                try {
                    let res = await fetch(href);
                    if (res.ok) {
                        let text = await res.text();
                        let style = document.createElement('style');
                        style.innerHTML = text;
                        link.parentNode.replaceChild(style, link);
                    }
                } catch(e) {}
            }
        }
        return docClone.outerHTML;
    }""")
    
    # Remove the domain name COMPLETELY from the final file
    html_data = html_data.replace('artofproblemsolving.com', 'offline-site.local')
    html_data = html_data.replace('//data.offline-site.local', '//offline-site.local')
    
    with open(html_filename, 'w', encoding='utf-8') as f:
        f.write("<!DOCTYPE html>\n<html>\n" + html_data + "\n</html>")
    print(f"  -> Saved Offline HTML to {html_filename}")

def cleanup_page(page):
    """Remove top navigation, bottom footer, and floating pagination buttons from the page"""
    # Inject CSS to force hide known headers and footers
    page.add_style_tag(content="""
        /* Generic site header and footer */
        #top-bar, #header-wrapper, #header, #main-menubar, #subheader, 
        .site-quick-nav, .menubar-content, .footer-container, .header-underlay, .sharedsitebar,
        
        /* Ebook reader specific navigation bar (dark blue/cyan area) */
        .ebk-book-header, 
        
        /* Ebook reader bottom pagination buttons (Previous / Back to Top / Next) */
        .ebk-section-body-footer,
        
        /* Ebook reader left chapter table of contents bar (C, 1, 2, 3...) */
        .ebk-toc-bar,
        
        /* Top breadcrumb navigation (Bookstore > My Books > ...) */
        .crumb-wrapper, .title-wrapper, .clickable-breadcrumb,
        
        /* Advertisement banner */
        .infobar,
        
        /* Headers and Footers from the website frame */
        #header, #header-wrapper, .sharedsite-wrapper, .site-dropdown-wrapper, 
        .ebk-book-header, .ebk-nav-top, .ebk-top-nav,
        .ebk-nav-bottom, .ebk-bottom-nav, .ebk-nav-buttons,
        #footer, .footer-wrapper, .site-footer, #main-footer, #small-footer-wrapper,
        .ebk-section-body-footer,
        
        /* Toolbars/Buttons around specific problems (e.g. discuss/topic buttons at top right) */
        .ebk-sb--top-right, .ebk-sb-top-right,
        
        /* Interactive problem elements (input box, hints, buttons) */
        .ebk-sb-prob-sub, .ebk-sb-hint, .ebk-sb-show-hint, .ebk-sb-hide-hint {
            display: none !important;
        }
        
        /* Remove the gray cube background and drop shadows from the entire page */
        body, html {
            background-image: none !important;
            background-color: #ffffff !important;
        }
        
        /* Remove shadows and force main containers to expand to full width to remove side blank spaces */
        #page-wrapper, .ebk-book-wrapper, .ebk-section-container, .ebk-book-main, .ebk-book-content-columns {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
        }
        
        /* Remove border and padding from the main container to keep it completely clean */
        .ebk-section-container {
            border: none !important;
        }
    """)
    
    # Remove all fixed/floating elements (usually headers/footers that stay on screen when scrolling)
    # Also fix hyperlinks: remove them since relative local PDF links are hard to generate reliably in Chromium
    page.evaluate("""() => {
        document.querySelectorAll('*').forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' || style.position === 'sticky') {
                // Ensure we don't accidentally delete the entire body, html, or ebook content container
                if (el.tagName !== 'BODY' && el.tagName !== 'HTML' && !el.className.includes('ebk-book')) {
                    el.remove();
                }
            }
        });
        
        // Handle hyperlinks
        document.querySelectorAll('a').forEach(a => {
            if (a.textContent && a.textContent.trim().toLowerCase() === 'here') {
                // Completely remove 'here' link elements
                let prev = a.previousSibling;
                let next = a.nextSibling;
                
                let nextStartsWithSpace = false;
                let nextStartsWithPunctuation = false;
                if (next) {
                    let firstNode = next;
                    while(firstNode && firstNode.nodeType !== 3 && firstNode.firstChild) {
                        firstNode = firstNode.firstChild;
                    }
                    if (firstNode && firstNode.nodeType === 3) {
                        nextStartsWithPunctuation = /^[.,!?;:]/.test(firstNode.textContent.trim());
                        nextStartsWithSpace = /^\s/.test(firstNode.textContent);
                    }
                }
                
                if ((nextStartsWithPunctuation || nextStartsWithSpace) && prev) {
                    let lastNode = prev;
                    while(lastNode && lastNode.nodeType !== 3 && lastNode.lastChild) {
                        lastNode = lastNode.lastChild;
                    }
                    if (lastNode && lastNode.nodeType === 3 && lastNode.textContent.endsWith(' ')) {
                        lastNode.textContent = lastNode.textContent.slice(0, -1);
                    }
                }
                
                a.remove();
            } else {
                // Simply remove all hrefs to prevent absolute path issues or broken web links
                a.removeAttribute('href');
                a.style.textDecoration = 'none';
                a.style.color = 'inherit';
            }
        });
    }""")

def main():
    output_dir = "output_pdfs_intro-geometry-ebook"
    #output_dir = "output_pdfs_intro-counting-ebook"
    #output_dir = "output_pdfs_intro-number-theory-ebook"
    #output_dir = "output_pdfs_intermediate-counting-ebook"
    #output_dir = "output_pdfs_precalculus-ebook"
    #output_dir = "output_pdfs_calculus-ebook"
    #output_dir = "output_pdfs_aops-vol1-ebook"
    #output_dir = "output_pdfs_aops-vol2-ebook"
    
    os.makedirs(output_dir, exist_ok=True)
    
    with sync_playwright() as p:
        if not os.path.exists(STATE_FILE):
            # ==========================================
            # Step 1: Use visible browser (Headless=False) for manual login
            # ==========================================
            print("Starting visible browser for manual login...")
            browser_visible = p.chromium.launch(headless=False)
            context_visible = browser_visible.new_context(viewport={'width': 1920, 'height': 1080})
            page_visible = context_visible.new_page()
            
            print(f"Navigating to directory page: {DIRECTORY_URL}")
            try:
                page_visible.goto(DIRECTORY_URL, wait_until="networkidle")
                
                print("\n" + "="*50)
                print("Please check if you need to log in in the popped-up browser.")
                print("Once login is complete, press [ENTER] in this terminal window to continue...")
                print("="*50 + "\n")
                input() # Wait for user confirmation
                
                # Save Cookie and login state to local file
                context_visible.storage_state(path=STATE_FILE)
                print("Login state saved successfully!")
                
            except Exception as e:
                print(f"Failed to load directory page: {e}")
                browser_visible.close()
                return
                
            # Close visible browser
            browser_visible.close()
        else:
            print(f"Found existing login state ({STATE_FILE}). Skipping manual login.")
            print("If you need to log in again, please delete the 'auth_state.json' file.")
            
        # ==========================================
        # Step 2: Use headless browser (Headless=True) to generate PDFs
        # Note: Playwright requires headless mode to export PDFs
        # ==========================================
        print("\nStarting headless browser (running silently in background) to generate PDFs...")
        browser_headless = p.chromium.launch(headless=True)
        # Load the previously saved login state
        context_headless = browser_headless.new_context(storage_state=STATE_FILE)
        page = context_headless.new_page()
        
        print("Reloading directory page and extracting links...")
        # Crucial fix: Trick the website into thinking we are viewing on a "screen" rather than "printing"
        page.emulate_media(media="screen")
        page.goto(DIRECTORY_URL, wait_until="networkidle")
        
        try:
            links = page.locator(LINK_SELECTOR).evaluate_all("elements => elements.map(e => e.href)")
            links = [link for link in links if link and link.startswith('http') and 'ebook' in link]
            
            unique_links = []
            for link in links:
                if link not in unique_links:
                    unique_links.append(link)
            links = unique_links
        except Exception as e:
            print(f"Error finding links: {e}")
            links = []
            
        print(f"Found {len(links)} valid links to process.")
        
        if len(links) == 0:
            print("No links found, exiting program.")
            browser_headless.close()
            return
            
        failed_links = []
        
        # First pass: Process each link sequentially
        for i, link in enumerate(links):
            print(f"[{i+1}/{len(links)}] Processing: {link}")
            
            safe_name = sanitize_filename(link)
            filename = os.path.join(output_dir, f"{safe_name}.pdf")
            html_filename = os.path.join(output_dir, f"{safe_name}.html")
            
            if os.path.exists(filename) and os.path.exists(html_filename):
                print(f"  -> Already exists, skipping: {filename}")
                continue
                
            try:
                page.goto(link, wait_until="networkidle")
                page.wait_for_timeout(3000)
                
                try:
                    page.wait_for_selector('.ebk-sb-par-marker-container', timeout=10000)
                except:
                    pass
                
                # Click all Reset buttons
                click_reset_buttons(page)
                
                # Expand all hints
                expand_all_hints(page)
                
                # Show all solutions for Exercises, Review, and Challenge
                show_all_solutions(page)
                
                # Extract problems to JSON
                extract_problems_to_json(page, filename, link, output_dir)
                
                # Extract the full content flow for the reader
                extract_content_flow_to_json(page, filename, link, output_dir)
                
                # Save offline HTML (with solutions expanded)
                save_offline_html(page, html_filename)
                
                # Hide redundant headers and footers
                cleanup_page(page)
                
                # Export to PDF (with solutions expanded)
                # print_background=True preserves web page background colors and images
                # format="A4" sets the paper size
                page.pdf(
                    path=filename, 
                    print_background=True, 
                    format="A4",
                    margin={"top": "10mm", "bottom": "10mm", "left": "10mm", "right": "10mm"}
                )
                print(f"  -> Saved PDF to {filename}")
                
                # Reset webpage completely after saving everything to prepare for the next page
                click_reset_buttons(page)
                page.reload(wait_until="networkidle")
                page.wait_for_timeout(3000)
                try:
                    page.wait_for_selector('.ebk-sb-par-marker-container', timeout=10000)
                except:
                    pass
            except Exception as e:
                print(f"  -> Failed to process {link}: {e}")
                failed_links.append(link)
                
        # Subsequent retries: Retry up to 3 times
        max_retries = 3
        for attempt in range(1, max_retries + 1):
            if not failed_links:
                break
                
            print("\n" + "="*50)
            print(f"Retry attempt {attempt} starting, currently {len(failed_links)} failed links...")
            print("="*50 + "\n")
            
            current_failed = []
            for i, link in enumerate(failed_links):
                print(f"[Retry attempt {attempt} - {i+1}/{len(failed_links)}] Processing: {link}")
                
                safe_name = sanitize_filename(link)
                filename = os.path.join(output_dir, f"{safe_name}.pdf")
                html_filename = os.path.join(output_dir, f"{safe_name}.html")
                
                if os.path.exists(filename) and os.path.exists(html_filename):
                    print(f"  -> Already exists, skipping: {filename}")
                    continue
                    
                try:
                    page.goto(link, wait_until="networkidle")
                    page.wait_for_timeout(5000) 
                    
                    try:
                        page.wait_for_selector('.ebk-sb-par-marker-container', timeout=10000)
                    except:
                        pass
                    
                    # Click all Reset buttons
                    click_reset_buttons(page)
                    
                    # Expand all hints
                    expand_all_hints(page)
                    
                    # Show all solutions for Exercises, Review, and Challenge
                    show_all_solutions(page)
                    
                    # Extract problems to JSON
                    extract_problems_to_json(page, filename, link, output_dir)
                    
                    # Extract the full content flow for the reader
                    extract_content_flow_to_json(page, filename, link, output_dir)
                    
                    # Save offline HTML (with solutions expanded)
                    save_offline_html(page, html_filename)
                    
                    # Hide redundant headers and footers
                    cleanup_page(page)
                    
                    page.pdf(
                        path=filename, 
                        print_background=True, 
                        format="A4",
                        margin={"top": "10mm", "bottom": "10mm", "left": "10mm", "right": "10mm"}
                    )
                    print(f"  -> Saved PDF to {filename}")
                    
                    # Reset webpage completely after saving everything to prepare for the next page
                    click_reset_buttons(page)
                    page.reload(wait_until="networkidle")
                    page.wait_for_timeout(3000)
                    try:
                        page.wait_for_selector('.ebk-sb-par-marker-container', timeout=10000)
                    except:
                        pass
                except Exception as e:
                    print(f"  -> Retry attempt {attempt} failed for {link}: {e}")
                    current_failed.append(link)
            
            failed_links = current_failed
            
        if failed_links:
            print(f"\nAll retries finished, still {len(failed_links)} links failed.")
        else:
            print("\nAll links processed successfully!")
            
        browser_headless.close()

if __name__ == "__main__":
    main()
