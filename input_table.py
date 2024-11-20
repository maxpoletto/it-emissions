"""Module to create a table of input fields to update a dictionary of parameters."""

from ipywidgets import HBox, IntSlider, IntText, Label, VBox

COLWIDTH = "120px"

def create_inputs(parameters, update_func, sliders=False, column_major=False):
    """Function to create a table of input fields to update a set of parameters.
    'parameters' is a nested dictionary of parameters with the following structure:
    { "item1": { "param1": value1, "param2": value2, ... }, "item2": { ... }, ... }
    'update_func' is a function to be called when any input field is updated.
    It takes a single input parameter, which is the updated parameters dictionary.
    If 'sliders' is True, the input fields are sliders, else text boxes.
    If 'column_major' is True, the rows are param1 ... paramN and the columns are item1 ... itemN,
    else the rows are item1 ... itemN and the columns are param1 ... paramN.
    """
    def create_input_fields(parameters, callback, input_fields):
        for key, params in parameters.items():
            input_fields[key] = {}
            for param, value in params.items():
                if sliders:
                    widget = IntSlider(value=value, min=0, max=value*10, step=1, layout={"width": COLWIDTH})
                else:
                    widget = IntText(value=value, layout={"width": COLWIDTH})
                widget.observe(callback, names='value')
                input_fields[key][param] = widget
        return input_fields
    def update_parameters(input_fields, parameters, update_func):
        for key, param_inputs in input_fields.items():
            parameters[key] = {param: input.value for param, input in param_inputs.items()}
        update_func(parameters)
    def create_layout(inputs, column_major):
        layout = []
        if column_major:
            column_names = list(inputs.keys())
        else:
            column_names = list(next(iter(inputs.values())).keys())
        header = HBox([Label("", layout={"width": COLWIDTH})] +
                    [Label(name, layout={"width": COLWIDTH}) for name in column_names])
        layout.append(header)
        if column_major:
            row_names = list(next(iter(inputs.values())).keys())
            for row_name in row_names:
                row = HBox([Label(row_name, layout={"width": COLWIDTH})] +
                        [param_inputs[row_name] for param_inputs in inputs.values()])
                layout.append(row)
        else:
            for key, param_inputs in inputs.items():
                row = HBox([Label(key, layout={"width": COLWIDTH})] +
                        [param_inputs[param] for param in column_names])
                layout.append(row)
        return VBox(layout)

    input_fields = {}
    observe_callback = lambda _: update_parameters(input_fields, parameters, update_func)
    create_input_fields(parameters, observe_callback, input_fields)
    return create_layout(input_fields, column_major)
