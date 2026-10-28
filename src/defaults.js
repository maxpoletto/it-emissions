// Inputs from the original calculator. Values are deliberately unchanged.
export const deviceInfoDefault = {
            'Laptops': {
                'Lifetime': 6,
                'Count': 32000,
                'Days per year': 250,
            },
            'Monitors': {
                'Lifetime': 8,
                'Count': 10440,
                'Days per year': 250,
            },
            'Desktops': {
                'Lifetime': 8,
                'Count': 0,
                'Days per year': 250,
            },
            'Servers': {
                'Lifetime': 5,
                'Count': 1121,
                'Days per year': 365,
            },
            'Mobile phones': {
                'Lifetime': 3,
                'Count': 35000,
                'Days per year': 250,
            },
            'A/V equipment': {
                'Lifetime': 8,
                'Count': 431,
                'Days per year': 250,
            },
            'Printers': {
                'Lifetime': 8,
                'Count': 333,
                'Days per year': 250,
            },
        };

        export const embodiedEmissionsKgCo2eDefault = {
            'Laptops': {
                'Mean': 180, // Split the difference between Rarecoil and Ecoinvent.
                'Stdev': 128,
                'Min': 104,
                'Max': 372,
            },
            'Monitors': {
                'Mean': 340, // Precise: 344
                'Stdev': 50,
                'Min': 150,
                'Max': 394,
            },
            'Desktops': {
                'Mean': 290, // Precise: 289
                'Stdev': 80,
                'Min': 209,
                'Max': 403,
            },
            'Servers': {
                'Mean': 1100, // Dell mean 1252, Boazvizta ~900
                'Stdev': 330,
                'Min': 383,
                'Max': 1582,
            },
            'Mobile phones': {
                'Mean': 50,
                'Stdev': 10,
                'Min': 30,
                'Max': 70,
            },
            'A/V equipment': {
                'Mean': 700, // Precise: 753
                'Stdev': 109,
                'Min': 644,
                'Max': 862,
            },
            'Printers': {
                'Mean': 1100, // Precise: 1167
                'Stdev': 200,
                'Min': 967,
                'Max': 1367,
            },
        };

        export const powerWDefault = {
            'Laptops': {
                'Mean': 50,
                'Stdev': 20,
                'Min': 20,
                'Max': 100,
                'Standby': 1,
            },
            'Monitors': {
                'Mean': 50,
                'Stdev': 10,
                'Min': 30,
                'Max': 90,
                'Standby': 1,
            },
            'Desktops': {
                'Mean': 100,
                'Stdev': 20,
                'Min': 60,
                'Max': 200,
                'Standby': 1,
            },
            'Servers': {
                'Mean': 400,
                'Stdev': 100,
                'Min': 200,
                'Max': 600,
                'Standby': 1,
            },
            'Mobile phones': {
                'Mean': 10,
                'Stdev': 2,
                'Min': 5,
                'Max': 20,
                'Standby': 0,
            },
            'A/V equipment': {
                'Mean': 250,
                'Stdev': 50,
                'Min': 150,
                'Max': 350,
                'Standby': 1,
            },
            'Printers': {
                'Mean': 1000,
                'Stdev': 200,
                'Min': 600,
                'Max': 1400,
                'Standby': 90,
            },
        };

        export const computeDefault = {
            'Campus networking overhead %': 10,
            'Campus data center PUE x100': 200,
            'Supercomputing mean power kW': 66,
        };

        export const llmsDefault = {
            'User population': 38000,
            'Mean daily user queries': 15,
            'Days per year': 250,
            'Mean query Wh': 1.0,
            'Training overhead %': 25,
            'Emissions intensity g CO2e / kWh': 207,
            'Embodied emissions g CO2e / query': 0.1,
            'Annual usage growth %': 50,
            'Annual efficiency growth %': 30,
            'Annual training growth %': 50,
        };

        export const dutyCycle6hDefault = {
            // Fraction of time active during 0:00-5:59, 6:00-11:59, 12:00-17:59, 18:00-23:59.
            // Just a guess, but probably not unreasonable.
            'Laptops': [0.1, 0.5, 1.0, 0.3],
            'Desktops': [0.1, 0.5, 1.0, 0.3],
            'Servers': [0.8, 0.8, 0.8, 0.8],
            'Mobile phones': [0.0, 0.0, 0.0, 0.5],
            'Monitors': [0.1, 0.5, 1.0, 0.3],
            'A/V equipment': [0.0, 0.3, 0.6, 0.1],
            'Printers': [0.0, 0.0, 0.01, 0.0],
        };


export const GRID_PROFILE = [63, 58, 58, 52, 49, 47, 45, 45, 49, 54, 62, 63];
