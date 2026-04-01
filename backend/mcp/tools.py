from plantuml import PlantUML

PLANTUML_SERVER = "http://www.plantuml.com/plantuml/png/"

def render_plantuml(uml_code: str, output_file="diagram.png"):
    server = PlantUML(url=PLANTUML_SERVER)

    try:
        print("\n Sending UML to PlantUML server...\n")

        # Try processes first (your version)

        image_data = server.processes(uml_code)
        

        if not image_data:
            print(" No image returned from server")
            return None

        with open(output_file, "wb") as f:
            f.write(image_data)

        print(" Diagram saved at:", output_file)
        return output_file

    except Exception as e:
        print(" PlantUML Error:", e)
        print("\nUML SENT:\n", uml_code)
        return None