const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'src', 'pages', 'AdminPage.tsx');
let text = fs.readFileSync(filepath, 'utf8');

// Replace Tab Name
text = text.replace('/> Escalas Ponto', '/> Colaboradores');

const lines = text.split('\n');
let i = 0;

while (i < lines.length) {
    if (lines[i].includes('<label') && lines[i].includes('Entrada</label>')) {
        if (i > 0 && lines[i-1].includes('<div>')) {
            const start_idx = i - 1;
            
            let block1 = lines.slice(start_idx, start_idx + 4);
            let block2 = lines.slice(start_idx + 4, start_idx + 8);
            let block3 = lines.slice(start_idx + 8, start_idx + 12);
            let block4 = lines.slice(start_idx + 12, start_idx + 16);
            
            if (block4[3].includes('</div>') && block4[2].includes('<input type="time"')) {
                console.log(`Found block at line ${start_idx}`);
                
                block1[1] = block1[1].replace('Entrada', 'Entrada');
                block2[1] = block2[1].replace('Saída', 'Saida');
                
                block3[1] = block3[1].replace(/>(Início Almoço|I\. Almoço)</g, '>E. Almoço<');
                block4[1] = block4[1].replace(/>(Retorno Almoço|V\. Almoço)</g, '>S. Almoço<');
                
                // Reorder
                const new_chunk = [...block1, ...block3, ...block4, ...block2];
                
                lines.splice(start_idx, 16, ...new_chunk);
                i = start_idx + 16;
                continue;
            }
        }
    }
    i++;
}

fs.writeFileSync(filepath, lines.join('\n'), 'utf8');
console.log('Done!');
