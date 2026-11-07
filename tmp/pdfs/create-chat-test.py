from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4

root = Path(__file__).resolve().parents[2]
out = root / 'output/pdf/course-chat-test-questions.pdf'
out.parent.mkdir(parents=True, exist_ok=True)
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='CellText', fontName='Helvetica', fontSize=9, leading=12, spaceAfter=0))
styles.add(ParagraphStyle(name='SmallNote', fontName='Helvetica', fontSize=9, leading=13, textColor=colors.HexColor('#475569')))
rows = [
('What does distributor coverage mean?', 'Assigning distributors to territories based on customer demand and service capacity.'),
('What two factors determine distributor coverage?', 'Customer demand and service capacity.'),
('How often must territory coverage be reviewed?', 'Every 30 days, or 45 days if you published that revision.'),
('What are the three distributor review metrics?', 'Outlet coverage, order fulfilment, and inventory availability.'),
('Is inventory availability a distributor review metric?', 'Yes.'),
('What inventory availability threshold triggers escalation?', 'Below 90 percent.'),
('Who must contact the distributor when inventory availability falls below 90 percent?', 'The territory manager.'),
('How quickly must the territory manager contact the distributor?', 'Within two working days.'),
('What should happen if inventory availability falls to 85 percent?', 'The territory manager must contact the distributor within two working days.')
]
story = [Paragraph('Course Chat: Pilot Test Questions', styles['Title']),
    Paragraph('Based on the sample Pilot Course Handbook', styles['SmallNote']), Spacer(1, 12),
    Paragraph('Use these expected answers only if your published document contains the sample handbook content. Check each factual answer against the current document and verify its citation opens the correct source.', styles['BodyText']), Spacer(1, 14)]
data = [[Paragraph('<b>Question</b>', styles['CellText']), Paragraph('<b>Expected answer</b>', styles['CellText'])]]
data += [[Paragraph(f'{i}. {q}', styles['CellText']), Paragraph(a, styles['CellText'])] for i, (q, a) in enumerate(rows, 1)]
table = Table(data, colWidths=[265, 246], repeatRows=1, hAlign='LEFT')
table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e0f2fe')),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('LEFTPADDING', (0,0), (-1,-1), 9), ('RIGHTPADDING', (0,0), (-1,-1), 9),
    ('TOPPADDING', (0,0), (-1,-1), 8), ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ('LINEBELOW', (0,0), (-1,0), 0.7, colors.HexColor('#94a3b8'))
]))
story += [table, Spacer(1, 16), Paragraph('Follow-Up Conversation', styles['Heading2'])]
for line in ['1. What are the three distributor review metrics?', '2. Which of those has an escalation threshold?', '3. What is that threshold?']:
    story.append(Paragraph(line, styles['BodyText']))
story += [Spacer(1, 10), Paragraph('Expected progression: the three metrics; inventory availability; below 90 percent. Answers should remain grounded in the handbook, not treat earlier assistant messages as evidence.', styles['SmallNote'])]
def footer(canvas, doc):
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor('#64748b'))
    canvas.drawString(42, 25, 'Magnafic LMS | Pilot verification')
    canvas.drawRightString(A4[0]-42, 25, str(doc.page))
SimpleDocTemplate(str(out), pagesize=A4, rightMargin=42, leftMargin=42, topMargin=36, bottomMargin=42).build(story, onFirstPage=footer, onLaterPages=footer)
print(out)
