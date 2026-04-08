import re
import os

filepath = r"c:\Users\Gabriel Santos\Downloads\Sistema_Monitoramento_Auditoria-main\Sistema_Monitoramento_Auditoria-main\src\pages\AdminPage.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace Tab Name
text = text.replace('/> Escalas Ponto', '/> Colaboradores')

# Find all blocks of 4 inputs and reorder them + rename labels
# We'll use a regex that captures the 4 consecutive <div> elements that contain the inputs.
# A safe way is to capture 4 divs that contain '<input type="time"' inside a single parent grid. 
# But we can also just split the file line by line and find the pattern.

lines = text.split('\n')
i = 0
while i < len(lines):
    # Find start of an input block which usually starts with a <div> containing an Entrada label.
    if '<label' in lines[i] and 'Entrada</label>' in lines[i]:
        # We assume the structure is:
        # div start
        # label
        # input
        # div end
        # We can look 1 line back for the <div>
        if i > 0 and '<div>' in lines[i-1].strip():
            # Looks like a block!
            start_idx = i - 1
            # There should be 4 such blocks. Each block is 4 lines: <div>, <label>, <input>, </div>
            block1 = lines[start_idx : start_idx+4]
            block2 = lines[start_idx+4 : start_idx+8]
            block3 = lines[start_idx+8 : start_idx+12]
            block4 = lines[start_idx+12 : start_idx+16]
            
            if '</div>' in block4[3] and '<input type="time"' in block4[2]:
                print(f"Found block at {start_idx}")
                
                # Update Labels
                block1[1] = block1[1].replace('Entrada', 'Entrada')
                block2[1] = block2[1].replace('Saída', 'Saida')
                # For block 3 (Inicio Almoco / I. Almoco) -> E. Almoço
                block3[1] = re.sub(r'>(Início Almoço|I\. Almoço)<', '>E. Almoço<', block3[1])
                # For block 4 (Retorno Almoco / V. Almoco) -> S. Almoço
                block4[1] = re.sub(r'>(Retorno Almoço|V\. Almoço)<', '>S. Almoço<', block4[1])
                
                # Reorder: Entrada, E. Almoço, S. Almoço, Saida
                # Which means: block1, block3, block4, block2
                
                new_chunk = block1 + block3 + block4 + block2
                
                lines[start_idx : start_idx+16] = new_chunk
                
                i = start_idx + 16
                continue
    i += 1

with open(filepath, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
