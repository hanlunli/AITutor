import fitz  # PyMuPDF
import os

def clean_pdf(input_path, output_path):
    doc = fitz.open(input_path)
    
    for page in doc:
        # 1. Remove the "Type your solution" grey box
        text_instances = page.search_for("Type your solution")
        for inst in text_instances:
            expanded_rect = fitz.Rect(
                95,               
                inst.y0 - 15,     
                500,              
                inst.y1 + 35      
            )
            page.add_redact_annot(expanded_rect)
            
        # 2. Remove standalone "Hint" text
        hint_instances = page.search_for("Hint")
        blocks = page.get_text("blocks")
        
        for inst in hint_instances:
            # Check if this "Hint" is a standalone block (not in the middle of a sentence)
            is_standalone = False
            for b in blocks:
                br = fitz.Rect(b[:4])
                if inst.intersects(br):
                    # If the block text is just "Hint" or "Hints", it's standalone
                    text = b[4].strip()
                    if text == "Hint" or text == "Hints":
                        is_standalone = True
                    break
            
            if is_standalone:
                # Expand slightly to ensure complete removal
                hint_rect = fitz.Rect(inst.x0 - 5, inst.y0 - 5, inst.x1 + 5, inst.y1 + 5)
                page.add_redact_annot(hint_rect)
                
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
            
    doc.save(output_path, garbage=4, deflate=True)
    doc.close()

def main():
    print("=== PDF Annotation & Widget Cleaner ===")
    folder_path = input("Enter the folder path containing the original PDFs: ").strip()
    txt_path = input("Enter the path to the txt file containing the PDF filenames: ").strip()
    
    if not os.path.exists(folder_path):
        print("Error: Folder does not exist!")
        return
        
    if not os.path.exists(txt_path):
        print("Error: txt file does not exist!")
        return
        
    output_folder = os.path.join(folder_path, "cleaned_pdfs")
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
        
    with open(txt_path, 'r', encoding='utf-8') as f:
        filenames = [line.strip() for line in f if line.strip()]
        
    print(f"\nFound {len(filenames)} files to process.")
    
    success_count = 0
    for filename in filenames:
        input_pdf = os.path.join(folder_path, filename)
        if not os.path.exists(input_pdf):
            print(f"Warning: File not found - {input_pdf}")
            continue
            
        output_pdf = os.path.join(output_folder, filename)
        print(f"Cleaning: {filename} ...")
        
        try:
            clean_pdf(input_pdf, output_pdf)
            success_count += 1
        except Exception as e:
            print(f"Error processing {filename}: {e}")
            
    print(f"\nAll done! Successfully cleaned {success_count} PDFs.")
    print(f"Cleaned files are saved in: {output_folder}")

if __name__ == "__main__":
    main()
