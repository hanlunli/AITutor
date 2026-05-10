import json
import re

text = """1 What's in a Name?
1.1 Why Names and Symbols?
1.2 Points, Lines, and Planes
1.3 Round and Round
1.4 Construction: Copy a Segment
1.5 The Burden of Proof
1.6 Summary
2 Angles
2.1 What is an Angle?
2.2 Measuring Angles
2.3 Straight and Vertical Angles
2.4 Parallel Lines
2.5 Angles in a Triangle
2.6 Exterior Angles
2.7 Parallel Lines Revisited
2.8 Summary
Review Problems
Challenge Problems
3 Congruent Triangles
3.1 Introduction
3.2 SSS Congruence
3.3 SAS Congruence
3.4 ASA and AAS Congruence
3.5 SSA Not-Necessarily Congruence
3.6 Isosceles and Equilateral Triangles
3.7 Construction: Equilateral Triangle and Perpendicular Bisector
3.8 Summary
Review Problems
Challenge Problems
Table of Contents
4 Perimeter and Area
4.1 Perimeter
4.2 Area
4.3 Same Base/Same Altitude
4.4 Summary
Review Problems
Challenge Problems
5 Similar Triangles
5.1 What is Similarity?
5.2 AA Similarity
5.3 SAS Similarity
5.4 SSS Similarity
5.5 Using Similarity in Problems
5.6 Construction: Angles and Parallels
5.7 Summary
Review Problems
Challenge Problems
6 Right Triangles
6.1 Pythagorean Theorem
6.2 Two Special Right Triangles
6.3 Pythagorean Triples
6.4 Congruence and Similarity Revisited
6.5★ Heron's Formula
6.6 Construction: Perpendicular Lines
6.7 Summary
Review Problems
Challenge Problems
7 Special Parts of a Triangle
7.1 Bisectors
7.2 Perpendicular Bisectors of a Triangle
7.3 Angle Bisectors of a Triangle
7.4 Medians
7.5 Altitudes
7.6★ Challenging Problems
7.7 Construction: Bisectors
7.8 Summary
Review Problems
Challenge Problems
8 Quadrilaterals
8.1 Quadrilateral Basics
8.2 Trapezoids
8.3 Parallelograms
8.4 Rhombi
8.5 Rectangles
8.6 Squares
8.7 If and Only If
8.8★ Quadrilateral Problems
8.9 Summary
Review Problems
Challenge Problems
9 Polygons
9.1 Introduction to Polygons
9.2 Angles in a Polygon
9.3 Polygon Area
9.4 Polygon Problems
9.5 Construction: Regular Polygons
9.6 Summary
Review Problems
Challenge Problems
10 Geometric Inequalities
10.1 Sides and Angles of a Triangle
10.2 Pythagoras -- Not Just For Right Triangles?
10.3 The Triangle Inequality
10.4 Summary
Review Problems
Challenge Problems
11 Circles
11.1 Arc Measure, Arc Length, and Circumference
11.2 Area
11.3 Funky Areas
11.4 Summary
Review Problems
Challenge Problems
12 Circles and Angles
12.1 Inscribed Angles
12.2 Angles Inside and Outside Circles
12.3 Tangents
12.4 Problems
12.5 Construction: Tangents
12.6 Summary
Review Problems
Challenge Problems
13 Power of a Point
13.1 What is Power of a Point?
13.2 Power of a Point Problems
13.3 Summary
Review Problems
Challenge Problems
14 Three-Dimensional Geometry
14.1 Planes
14.2 Prisms
14.3 Pyramids
14.4 Regular Polyhedra
14.5 Summary
Review Problems
Challenge Problems
15 Curved Surfaces
15.1 Cylinders
15.2 Cones
15.3 Spheres
15.4 Problems
15.5 Summary
Review Problems
Challenge Problems
16 The More Things Change...
16.1 Translations
16.2 Rotations
16.3 Reflections
16.4 Dilation
16.5 Changing the Question
16.6 Construction: Transformations
16.7 Summary
Review Problems
Challenge Problems
17 Analytic Geometry
17.1 Lines
17.2 Circles
17.3 Basic Analytic Geometry Problems
17.4 Proofs with Analytic Geometry
17.5 Distance Between a Point and a Line
17.6 Advanced Analytic Geometry Problems
17.7 Summary
Review Problems
Challenge Problems
18 Introduction to Trigonometry
18.1 Trigonometry and Right Triangles
18.2 Not Just For Right Triangles
18.3 Law of Sines and Law of Cosines
18.4 Summary
Review Problems
Challenge Problems
19 Problem Solving Strategies in Geometry
19.1 The Extra Line
19.2 Assigning Variables
19.3 Proofs
19.4 Summary
Challenge Problems"""

lines = text.strip().split('\n')
result = []

current_chapter_obj = None
current_chapter_num = None

for line in lines:
    line = line.strip()
    if not line:
        continue
    if line == "Table of Contents":
        continue
    
    # Check if it's a chapter (e.g., "1 What's in a Name?")
    chapter_match = re.match(r'^(\d+)\s+(.*)', line)
    # Check if it's a section (e.g., "1.1 Why Names and Symbols?")
    section_match = re.match(r'^(\d+)\.(\d+)[★]?\s+(.*)', line)
    
    if section_match:
        c_num = section_match.group(1)
        s_num = section_match.group(2)
        filename = f"artofproblemsolving.com_ebooks_intro-geometry-ebook_c{c_num}s{s_num}.pdf"
        if current_chapter_obj:
            current_chapter_obj["children"].append({
                "title": line,
                "pdf": filename
            })
    elif chapter_match:
        c_num = chapter_match.group(1)
        current_chapter_num = c_num
        current_chapter_obj = {
            "title": line,
            "children": []
        }
        result.append(current_chapter_obj)
    elif line == "Review Problems":
        if current_chapter_obj:
            filename = f"artofproblemsolving.com_ebooks_intro-geometry-ebook_c{current_chapter_num}pr.pdf"
            current_chapter_obj["children"].append({
                "title": f"Chapter {current_chapter_num} Review Problems",
                "pdf": filename
            })
    elif line == "Challenge Problems":
        if current_chapter_obj:
            filename = f"artofproblemsolving.com_ebooks_intro-geometry-ebook_c{current_chapter_num}pc.pdf"
            current_chapter_obj["children"].append({
                "title": f"Chapter {current_chapter_num} Challenge Problems",
                "pdf": filename
            })

with open('toc_mapping.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, indent=4, ensure_ascii=False)
