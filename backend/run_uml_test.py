from llm.uml_generator import generate_plantuml
blocks = generate_plantuml(
    user_input='Generate a class diagram for a calculator with Calculator and Adder classes',
    context='',
    count=1,
    diagram_type='class'
)
print('BLOCKS:', blocks)
