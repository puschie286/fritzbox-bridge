// Default hue and high/medium/low saturation values from the AHA HTTP specification.
// https://fritz.support/resources/AHA-HTTP-Interface.pdf, section 3.6.
export const FRITZBOX_COLORS = {
	orange: { hue: 35, saturations: [ 214, 140, 72 ] },
	yellow: { hue: 52, saturations: [ 153, 102, 51 ] },
	lime: { hue: 92, saturations: [ 123, 79, 38 ] },
	green: { hue: 107, saturations: [ 130, 82, 38 ] },
	turquoise: { hue: 155, saturations: [ 133, 84, 41 ] },
	cyan: { hue: 191, saturations: [ 179, 118, 59 ] },
	lightblue: { hue: 218, saturations: [ 169, 110, 56 ] },
	blue: { hue: 225, saturations: [ 204, 135, 67 ] },
	purple: { hue: 266, saturations: [ 169, 110, 54 ] },
	magenta: { hue: 296, saturations: [ 140, 92, 46 ] },
	pink: { hue: 335, saturations: [ 163, 107, 51 ] },
	red: { hue: 358, saturations: [ 179, 112, 54 ] }
} as const;
