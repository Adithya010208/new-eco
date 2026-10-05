/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  StudioComponentSpec,
  WireConnection,
  AssemblyStep,
  PinEndpoint,
} from '../types';

/**
 * Predefined 3D Recipe definition for "proj-night-light"
 * (Automatic Night Light with LDR Sensor).
 *
 * TECHNICAL DESIGN & CIRCUIT ARCHITECTURE:
 * - Arduino Uno: ATmega328P 5V logic controller.
 * - LDR GL5528: Photoresistor changing resistance inversely with ambient light (~1M ohm in dark, ~10k ohm in bright light).
 * - 10k Resistor: Fixed pull-down resistor forming a voltage divider with the LDR.
 *   V_out = 5V * (R_fixed / (R_ldr + R_fixed)).
 *   In darkness, R_ldr rises, pulling V_out towards 0V. In bright light, R_ldr drops, pulling V_out towards 5V.
 * - 5mm LED: Output indicator, forward voltage ~1.8V - 2.0V, max continuous current ~20mA.
 * - 220 Resistor: Current-limiting resistor for LED. (5V - 2V) / 220 ohm = ~13.6mA safe driving current from Pin D9.
 *
 * LOW-VOLTAGE SPECIFICATION:
 * All parts run safely on 5V logic powered directly from Arduino Uno with total consumption <25mA.
 * No external power supply or common ground isolation bridge required.
 */

// 1. Interactive Pin Endpoints
export const NIGHT_LIGHT_PINS: PinEndpoint[] = [
  // Arduino Uno Pins
  {
    id: 'uno-5v',
    componentId: 'comp-arduino',
    name: 'Arduino 5V Regulated Output',
    label: '5V',
    signalType: 'power-5v',
    position: [3.45, 0.35, -0.7],
    direction: [0, 1, 0],
    description: 'Provides regulated +5.0V DC to the breadboard positive distribution rail for the LDR voltage divider.',
    voltage: '5.0V DC',
  },
  {
    id: 'uno-gnd-1',
    componentId: 'comp-arduino',
    name: 'Arduino Ground (GND)',
    label: 'GND',
    signalType: 'ground',
    position: [3.45, 0.35, -0.4],
    direction: [0, 1, 0],
    description: 'Circuit ground reference connected to breadboard ground rail.',
    voltage: '0.0V (GND)',
  },
  {
    id: 'uno-a0',
    componentId: 'comp-arduino',
    name: 'Arduino Analog Input 0 (A0)',
    label: 'A0',
    signalType: 'analog',
    position: [3.45, 0.35, 0.8],
    direction: [0, 1, 0],
    description: 'Analog input reading the intermediate voltage of the LDR voltage divider (0 to 1023 ADC counts).',
    voltage: '0V - 5V Analog',
  },
  {
    id: 'uno-d9',
    componentId: 'comp-arduino',
    name: 'Arduino Digital/PWM Output 9 (D9)',
    label: 'D9 (PWM)',
    signalType: 'digital-out',
    position: [1.55, 0.35, -0.9],
    direction: [0, 1, 0],
    description: 'Microcontroller digital output driving the LED through a 220 ohm current-limiting resistor.',
    voltage: '5.0V Digital',
  },

  // Breadboard Rails
  {
    id: 'bb-rail-plus',
    componentId: 'comp-breadboard',
    name: 'Breadboard Positive Rail (+)',
    label: '+ Rail',
    signalType: 'power-5v',
    position: [0.2, 0.3, -1.8],
    direction: [0, 1, 0],
    description: 'Positive 5V power bus.',
    voltage: '5.0V DC',
  },
  {
    id: 'bb-rail-minus',
    componentId: 'comp-breadboard',
    name: 'Breadboard Ground Rail (-)',
    label: '- Rail (GND)',
    signalType: 'ground',
    position: [0.2, 0.3, -1.6],
    direction: [0, 1, 0],
    description: 'Common ground bus.',
    voltage: '0.0V (GND)',
  },

  // LDR Sensor Pins
  {
    id: 'ldr-pin1',
    componentId: 'comp-ldr',
    name: 'LDR Terminal 1 (+5V Side)',
    label: 'LDR T1',
    signalType: 'power-5v',
    position: [-0.8, 0.35, -0.6],
    direction: [0, 1, 0],
    description: 'First leg of GL5528 photoresistor, connected to +5V rail.',
    voltage: '5.0V DC',
  },
  {
    id: 'ldr-pin2',
    componentId: 'comp-ldr',
    name: 'LDR Terminal 2 (Divider Node)',
    label: 'LDR T2 (Node)',
    signalType: 'analog',
    position: [-0.4, 0.35, -0.6],
    direction: [0, 1, 0],
    description: 'Intermediate divider node connecting LDR and 10k resistor to Arduino Pin A0.',
    voltage: 'Analog Divider Node',
  },

  // 10k Resistor Pins
  {
    id: 'res10k-pin1',
    componentId: 'comp-res-10k',
    name: '10k Resistor Terminal 1 (Divider Node)',
    label: '10k T1',
    signalType: 'analog',
    position: [-0.4, 0.35, -0.2],
    direction: [0, 1, 0],
    description: 'Tied to LDR Terminal 2 and Arduino A0.',
    voltage: 'Analog Divider Node',
  },
  {
    id: 'res10k-pin2',
    componentId: 'comp-res-10k',
    name: '10k Resistor Terminal 2 (GND Side)',
    label: '10k T2 (GND)',
    signalType: 'ground',
    position: [-0.4, 0.35, -1.6],
    direction: [0, 1, 0],
    description: 'Pull-down resistor connection to ground bus.',
    voltage: '0.0V (GND)',
  },

  // 220 Resistor Pins
  {
    id: 'res220-pin1',
    componentId: 'comp-res-220',
    name: '220 Resistor Terminal 1 (From D9)',
    label: '220 T1',
    signalType: 'digital-out',
    position: [0.6, 0.35, 0.2],
    direction: [0, 1, 0],
    description: 'Receives digital signal from Arduino Pin D9.',
    voltage: '5.0V Digital',
  },
  {
    id: 'res220-pin2',
    componentId: 'comp-res-220',
    name: '220 Resistor Terminal 2 (To LED Anode)',
    label: '220 T2',
    signalType: 'digital-out',
    position: [1.0, 0.35, 0.2],
    direction: [0, 1, 0],
    description: 'Current-limited connection to LED long lead (anode).',
    voltage: '~2.0V Forward',
  },

  // 5mm LED Pins
  {
    id: 'led-anode',
    componentId: 'comp-led',
    name: 'LED Anode (+) Long Lead',
    label: 'LED Anode',
    signalType: 'digital-out',
    position: [1.0, 0.45, 0.6],
    direction: [0, 1, 0],
    description: 'Positive LED lead receiving current from 220 ohm resistor.',
    voltage: '~2.0V Forward',
  },
  {
    id: 'led-cathode',
    componentId: 'comp-led',
    name: 'LED Cathode (-) Flat Edge Short Lead',
    label: 'LED Cathode',
    signalType: 'ground',
    position: [1.0, 0.35, -1.6],
    direction: [0, 1, 0],
    description: 'Negative LED lead connected to common ground rail.',
    voltage: '0.0V (GND)',
  },
];

// 2. Wires
export const NIGHT_LIGHT_WIRES: WireConnection[] = [
  // Wire 1: Uno 5V to Breadboard + Rail
  {
    id: 'wire-uno-5v-bb',
    fromPinId: 'uno-5v',
    toPinId: 'bb-rail-plus',
    fromComponentId: 'comp-arduino',
    toComponentId: 'comp-breadboard',
    color: 'Red (+5V Power)',
    hexColor: '#EF4444',
    signalName: '+5V Power Rail',
    wireGauge: '22 AWG Solid Core',
    stepIntroduced: 0,
    description: 'Supplies 5V regulated logic power to the breadboard distribution rail.',
  },
  // Wire 2: Uno GND to Breadboard - Rail
  {
    id: 'wire-uno-gnd-bb',
    fromPinId: 'uno-gnd-1',
    toPinId: 'bb-rail-minus',
    fromComponentId: 'comp-arduino',
    toComponentId: 'comp-breadboard',
    color: 'Black (Ground)',
    hexColor: '#1F2937',
    signalName: 'GND Return',
    wireGauge: '22 AWG Solid Core',
    stepIntroduced: 0,
    description: 'Establishes the common ground reference across the breadboard.',
  },
  // Wire 3: Breadboard + Rail to LDR Terminal 1
  {
    id: 'wire-bb-ldr-plus',
    fromPinId: 'bb-rail-plus',
    toPinId: 'ldr-pin1',
    fromComponentId: 'comp-breadboard',
    toComponentId: 'comp-ldr',
    color: 'Red (+5V)',
    hexColor: '#EF4444',
    signalName: 'LDR High Side',
    wireGauge: '22 AWG Solid Core',
    stepIntroduced: 1,
    description: 'Connects the top leg of the LDR to +5V.',
  },
  // Wire 4: LDR Terminal 2 to 10k Resistor Terminal 1 (Divider Node)
  {
    id: 'wire-ldr-res10k-node',
    fromPinId: 'ldr-pin2',
    toPinId: 'res10k-pin1',
    fromComponentId: 'comp-ldr',
    toComponentId: 'comp-res-10k',
    color: 'Yellow (Divider Node)',
    hexColor: '#F59E0B',
    signalName: 'Divider Center Node',
    wireGauge: 'Breadboard Internal Strip',
    stepIntroduced: 1,
    description: 'Forms the voltage divider junction between the LDR and 10k resistor.',
  },
  // Wire 5: 10k Resistor Terminal 2 to Ground Rail
  {
    id: 'wire-res10k-gnd',
    fromPinId: 'res10k-pin2',
    toPinId: 'bb-rail-minus',
    fromComponentId: 'comp-res-10k',
    toComponentId: 'comp-breadboard',
    color: 'Black (Ground)',
    hexColor: '#1F2937',
    signalName: '10k Pull-down Ground',
    wireGauge: 'Resistor Lead',
    stepIntroduced: 1,
    description: 'Completes the pull-down leg to breadboard ground rail.',
  },
  // Wire 6: Divider Node to Arduino A0
  {
    id: 'wire-divider-to-a0',
    fromPinId: 'ldr-pin2',
    toPinId: 'uno-a0',
    fromComponentId: 'comp-ldr',
    toComponentId: 'comp-arduino',
    color: 'Yellow (Analog Sense)',
    hexColor: '#F59E0B',
    signalName: 'LDR Analog Sense',
    wireGauge: '24 AWG Jumper',
    stepIntroduced: 1,
    description: 'Routes variable voltage to ADC Analog Pin 0 to measure light levels.',
  },
  // Wire 7: Arduino D9 to 220 Resistor Terminal 1
  {
    id: 'wire-uno-d9-res220',
    fromPinId: 'uno-d9',
    toPinId: 'res220-pin1',
    fromComponentId: 'comp-arduino',
    toComponentId: 'comp-res-220',
    color: 'Blue (LED Control)',
    hexColor: '#3B82F6',
    signalName: 'LED Digital Output',
    wireGauge: '24 AWG Jumper',
    stepIntroduced: 2,
    description: 'Connects Digital Pin 9 to the 220 ohm current-limiting resistor.',
  },
  // Wire 8: 220 Resistor to LED Anode
  {
    id: 'wire-res220-led',
    fromPinId: 'res220-pin2',
    toPinId: 'led-anode',
    fromComponentId: 'comp-res-220',
    toComponentId: 'comp-led',
    color: 'Green (Current-Limited)',
    hexColor: '#10B981',
    signalName: 'LED Anode Current',
    wireGauge: 'Breadboard Internal Strip',
    stepIntroduced: 2,
    description: 'Supplies protected current to the LED anode.',
  },
  // Wire 9: LED Cathode to Ground Rail
  {
    id: 'wire-led-cathode-gnd',
    fromPinId: 'led-cathode',
    toPinId: 'bb-rail-minus',
    fromComponentId: 'comp-led',
    toComponentId: 'comp-breadboard',
    color: 'Black (Ground)',
    hexColor: '#1F2937',
    signalName: 'LED Ground Return',
    wireGauge: 'LED Lead / Jumper',
    stepIntroduced: 2,
    description: 'Returns LED cathode current to common ground.',
  },
];

// 3. Components Spec
export const NIGHT_LIGHT_COMPONENTS: StudioComponentSpec[] = [
  {
    id: 'comp-arduino',
    catalogId: 'comp-arduino-uno',
    name: 'Arduino Uno R3 Microcontroller',
    category: 'microcontroller',
    description: 'ATmega328P based 5V microcontroller running the night light threshold comparison loop.',
    position: [2.5, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    pins: NIGHT_LIGHT_PINS.filter((p) => p.componentId === 'comp-arduino'),
    electricalSpecs: {
      manufacturerSpecs: {
        operatingVoltage: '5.0V DC (USB or 7-12V barrel jack)',
        quiescentCurrent: '~45mA logic idle',
        logicLevels: 'HIGH: 4.2V - 5.0V, LOW: 0.0V - 0.9V',
        datasheetSource: 'Microchip ATmega328P / Arduino Uno Rev3 Schematic',
      },
      animationParameters: {
        simulatedRangeOrAngle: 'Analog ADC 0-1023 counts, Threshold ~500',
        timingOrPwmPulse: '100ms sample loop with hysteresis',
        notes: 'Low total consumption: whole circuit consumes <65mA.',
      },
      variantDependent: {
        stallCurrentRating: 'N/A (No motors in this low-voltage recipe)',
        cloneVariations: 'CH340G vs ATmega16U2 USB interface chip',
        unresolvedAssumptions: 'Fixed threshold assumes indoor ambient room lighting transitions',
      },
      cautions: 'Never connect LED directly to digital pins without current-limiting resistor.',
    },
  },
  {
    id: 'comp-breadboard',
    catalogId: 'comp-breadboard-half',
    name: 'Half-Size Solderless Breadboard',
    category: 'prototyping',
    description: '400 tie-point prototyping board with dual distribution power rails.',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    pins: NIGHT_LIGHT_PINS.filter((p) => p.componentId === 'comp-breadboard'),
    electricalSpecs: {
      manufacturerSpecs: {
        operatingVoltage: 'Up to 30V DC / 1.5A per tie point',
        quiescentCurrent: '0 mA (passive contact array)',
        logicLevels: 'Pass-through conductive phosphor bronze clips',
        datasheetSource: 'Standard 400-point solderless tie-block specifications',
      },
      animationParameters: {
        simulatedRangeOrAngle: '5 tie points per terminal row',
        timingOrPwmPulse: 'N/A',
        notes: 'Top and bottom bus rails are isolated unless explicitly jumpered.',
      },
      variantDependent: {
        stallCurrentRating: 'N/A',
        cloneVariations: 'Contact clip tension and insertion resistance variations',
        unresolvedAssumptions: 'Assumes continuous full-length rail connection',
      },
      cautions: 'Avoid bending resistor leads too close to body to preserve mechanical seal.',
    },
  },
  {
    id: 'comp-ldr',
    catalogId: 'comp-ldr-gl5528',
    name: 'GL5528 Photoresistor (LDR)',
    category: 'sensor',
    description: 'Cadmium-sulfide light-dependent resistor whose resistance varies inversely with illumination.',
    position: [-0.6, 0.25, -0.6],
    rotation: [0, 0, 0],
    pins: NIGHT_LIGHT_PINS.filter((p) => p.componentId === 'comp-ldr'),
    electricalSpecs: {
      manufacturerSpecs: {
        operatingVoltage: 'Max 150V DC (operated at 5V logic)',
        quiescentCurrent: 'Variable dependent on light (0.005mA - 0.5mA)',
        logicLevels: 'Continuous analog resistance: 1M ohm (dark) to 10k-20k ohm (10 lux daylight)',
        datasheetSource: 'Senba Sensing Tech GL5528 LDR Datasheet',
      },
      animationParameters: {
        simulatedRangeOrAngle: 'Simulated 0 to 100% ambient lux level',
        timingOrPwmPulse: 'Response time ~20ms-30ms',
        notes: 'Non-polarized component: either lead can face +5V or divider node.',
      },
      variantDependent: {
        stallCurrentRating: 'N/A',
        cloneVariations: 'GL5516 / GL5537 / GL5549 variants have different dark resistance curves',
        unresolvedAssumptions: 'Spectral sensitivity peaks at ~540nm (green/yellow visible light)',
      },
      cautions: 'Keep lead spacing consistent to prevent short circuits against adjacent resistor leads.',
    },
  },
  {
    id: 'comp-res-10k',
    catalogId: 'comp-res-10k',
    name: '10k Ohm Resistor (1/4W)',
    category: 'passive',
    description: 'Fixed 10,000 ohm metal-film pull-down resistor forming the baseline voltage divider.',
    position: [-0.4, 0.2, -0.9],
    rotation: [0, 0, 0],
    pins: NIGHT_LIGHT_PINS.filter((p) => p.componentId === 'comp-res-10k'),
    electricalSpecs: {
      manufacturerSpecs: {
        operatingVoltage: 'Rated 250V / 0.25W power dissipation',
        quiescentCurrent: 'Max 0.5mA at 5V',
        logicLevels: 'Fixed resistance: 10,000 ohms +/- 5% (Brown-Black-Orange-Gold)',
        datasheetSource: 'Generic EIA 1/4-Watt Resistor Standard',
      },
      animationParameters: {
        simulatedRangeOrAngle: 'Fixed passive divider bottom leg',
        timingOrPwmPulse: 'Instantaneous response',
        notes: 'Non-polarized component.',
      },
      variantDependent: {
        stallCurrentRating: 'N/A',
        cloneVariations: 'Carbon film (5%) vs Metal film (1%) tolerance',
        unresolvedAssumptions: 'Thermal drift minimal under 5V circuit conditions',
      },
      cautions: 'Ensure leads enter distinct breadboard tie rows.',
    },
  },
  {
    id: 'comp-led',
    catalogId: 'comp-led-5mm',
    name: '5mm Diffused LED Indicator',
    category: 'actuator',
    description: 'Diffused light-emitting diode activated when ambient darkness crosses the defined threshold.',
    position: [1.0, 0.3, 0.6],
    rotation: [0, 0, 0],
    pins: NIGHT_LIGHT_PINS.filter((p) => p.componentId === 'comp-led'),
    electricalSpecs: {
      manufacturerSpecs: {
        operatingVoltage: 'Forward Voltage V_f: 1.8V - 2.2V',
        quiescentCurrent: 'Forward Current I_f: 10mA - 20mA (nominal 14mA with 220 ohm resistor)',
        logicLevels: 'Diode forward conduction above ~1.8V threshold',
        datasheetSource: 'Generic 5mm Diffused Red/Yellow Indicator LED Standard',
      },
      animationParameters: {
        simulatedRangeOrAngle: 'Illuminates when light drops below 40% lux threshold',
        timingOrPwmPulse: 'PWM adjustable or binary ON/OFF',
        notes: 'Longer lead is Anode (+); flat notch indicates Cathode (-).',
      },
      variantDependent: {
        stallCurrentRating: 'N/A',
        cloneVariations: 'Color variations alter forward voltage (Red ~1.9V, Green ~2.2V, Blue/White ~3.2V)',
        unresolvedAssumptions: '220 ohm value tailored for safe operation with all visible 5mm LED colors',
      },
      cautions: 'Always observe polarity; reverse breakdown voltage is ~5V.',
    },
  },
  {
    id: 'comp-res-220',
    catalogId: 'comp-res-220',
    name: '220 Ohm Current Limiting Resistor (1/4W)',
    category: 'passive',
    description: 'Limits microcontroller output current to protect ATmega328P output driver and the LED.',
    position: [0.8, 0.2, 0.2],
    rotation: [0, 0, 0],
    pins: NIGHT_LIGHT_PINS.filter((p) => p.componentId === 'comp-res-220'),
    electricalSpecs: {
      manufacturerSpecs: {
        operatingVoltage: 'Rated 250V / 0.25W power dissipation',
        quiescentCurrent: 'Current (5V - 1.9V) / 220 = ~14.1mA (Power ~0.044W << 0.25W max rating)',
        logicLevels: 'Fixed resistance: 220 ohms +/- 5% (Red-Red-Brown-Gold)',
        datasheetSource: 'Generic EIA 1/4-Watt Resistor Standard',
      },
      animationParameters: {
        simulatedRangeOrAngle: 'Fixed current limit',
        timingOrPwmPulse: 'Instantaneous response',
        notes: 'Non-polarized component.',
      },
      variantDependent: {
        stallCurrentRating: 'N/A',
        cloneVariations: 'Tolerance 1% vs 5%',
        unresolvedAssumptions: 'Safe for ATmega328P per-pin 40mA absolute maximum rating',
      },
      cautions: 'Do not bypass or short out this resistor.',
    },
  },
];

// 4. Step-by-Step Assembly Steps
export const NIGHT_LIGHT_STEPS: AssemblyStep[] = [
  {
    stepNumber: 0,
    id: 'step-power-rails',
    title: 'Base Placement & Power Rail Setup',
    shortName: 'Power Rails',
    summary: 'Distribute 5V DC and common Ground from the Arduino Uno to the breadboard distribution buses.',
    detailedInstructions: [
      'Position the Arduino Uno and Half-Size Breadboard side-by-side on your work surface.',
      'Connect a red solid jumper wire from Arduino 5V header pin to the Breadboard Red (+) distribution bus.',
      'Connect a black solid jumper wire from Arduino GND header pin to the Breadboard Blue/Black (-) distribution bus.',
      'Verify that 5V and Ground rails are not shorted together. This simple low-voltage circuit is powered entirely from the Uno USB port without external battery packs.',
    ],
    activeComponentIds: ['comp-arduino', 'comp-breadboard'],
    activeWireIds: ['wire-uno-5v-bb', 'wire-uno-gnd-bb'],
    highlightPinIds: ['uno-5v', 'uno-gnd-1', 'bb-rail-plus', 'bb-rail-minus'],
    cameraPreset: 'power-rails',
    cameraPosition: [3.5, 4.5, -2],
    cameraTarget: [1.2, 0.4, -1],
    checkpointTip: 'Because this circuit consumes under 25mA total, no external power supply or common-ground bridge is required.',
  },
  {
    stepNumber: 1,
    id: 'step-ldr-divider',
    title: 'LDR Light Sensor Voltage Divider',
    shortName: 'LDR Sensor',
    summary: 'Form a voltage divider using the GL5528 photoresistor and 10k resistor connected to Analog Pin A0.',
    detailedInstructions: [
      'Insert one leg of the GL5528 photoresistor into the breadboard +5V distribution bus.',
      'Insert the second leg of the photoresistor into an empty tie row (Row 10).',
      'Insert one leg of the 10k ohm resistor (Brown-Black-Orange) into the same Row 10, connecting it to the LDR second leg.',
      'Connect the remaining leg of the 10k ohm resistor to the breadboard Ground (-) bus.',
      'Insert a yellow jumper wire from Row 10 (the intermediate divider node) into Arduino Analog Input Pin A0.',
    ],
    activeComponentIds: ['comp-ldr', 'comp-res-10k'],
    activeWireIds: [
      'wire-bb-ldr-plus',
      'wire-ldr-res10k-node',
      'wire-res10k-gnd',
      'wire-divider-to-a0',
    ],
    highlightPinIds: ['ldr-pin1', 'ldr-pin2', 'res10k-pin1', 'res10k-pin2', 'uno-a0'],
    cameraPreset: 'sensor-front',
    cameraPosition: [-1.2, 4.0, -1.0],
    cameraTarget: [-0.4, 0.4, -0.6],
    checkpointTip: 'In bright light, the LDR resistance drops to ~10k, producing ~2.5V on A0. In total darkness, resistance surges past 1M ohm, pulling A0 down near 0.05V.',
  },
  {
    stepNumber: 2,
    id: 'step-led-circuit',
    title: 'LED Output & Current Limiting Resistor',
    shortName: 'LED Output',
    summary: 'Wire the indicator LED and 220 ohm protective resistor from Arduino Digital Pin D9 to ground.',
    detailedInstructions: [
      'Connect a blue jumper wire from Arduino Digital Pin D9 to an empty breadboard tie row (Row 20).',
      'Insert one lead of the 220 ohm resistor (Red-Red-Brown) into Row 20.',
      'Insert the other lead of the 220 ohm resistor into Row 21.',
      'Locate the long lead (Anode +) of your 5mm LED and insert it into Row 21.',
      'Insert the short lead (Cathode - flat edge) of the LED into the Ground (-) distribution rail.',
    ],
    activeComponentIds: ['comp-res-220', 'comp-led'],
    activeWireIds: ['wire-uno-d9-res220', 'wire-res220-led', 'wire-led-cathode-gnd'],
    highlightPinIds: ['uno-d9', 'res220-pin1', 'res220-pin2', 'led-anode', 'led-cathode'],
    cameraPreset: 'overview',
    cameraPosition: [2.5, 4.0, 1.5],
    cameraTarget: [1.0, 0.4, 0.5],
    checkpointTip: 'Never connect the LED directly to Pin D9 without the 220 ohm resistor, or you risk burning out the microcontroller output driver.',
  },
  {
    stepNumber: 3,
    id: 'step-behavior-preview',
    title: 'Behavior Verification & Ambient Light Simulation',
    shortName: 'Live Simulation',
    summary: 'Simulate room illumination changes to verify automatic night light switching.',
    detailedInstructions: [
      'Cover the LDR sensor with your finger to simulate night-time room darkness.',
      'The analog reading on Pin A0 will drop below the 500 ADC count threshold.',
      'Arduino Digital Pin D9 will automatically drive HIGH (5V), illuminating the LED.',
      'Uncover the sensor to simulate ambient daylight; the analog reading climbs above threshold, automatically turning the LED OFF.',
    ],
    activeComponentIds: [
      'comp-arduino',
      'comp-breadboard',
      'comp-ldr',
      'comp-res-10k',
      'comp-led',
      'comp-res-220',
    ],
    activeWireIds: NIGHT_LIGHT_WIRES.map((w) => w.id),
    highlightPinIds: ['ldr-pin2', 'uno-a0', 'uno-d9', 'led-anode'],
    cameraPreset: 'simulation',
    cameraPosition: [4.0, 5.0, 4.0],
    cameraTarget: [0.5, 0.5, 0],
    checkpointTip: 'Firmware hysteresis (turn ON at <450, turn OFF at >550) prevents the LED from flickering around twilight light conditions.',
  },
];
