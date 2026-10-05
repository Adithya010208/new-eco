/** Curated reference links, checked 2026-10-05. No changes to project matching data. */
export interface ProjectResource {
  title: string;
  url: string;
  source: string;
  kind: 'documentation' | 'tutorial' | 'research';
  year?: number;
  note: string;
  steps?: string[];
}
const board: ProjectResource = {
  title: 'Arduino UNO R3 datasheet', source: 'Arduino', kind: 'documentation',
  url: 'https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf',
  note: 'Board pinout and electrical specifications. Confirm your actual board variant before wiring.',
  steps: ['step-power-rails', 'step-bench-inspection', 'step-power-rails'],
};
const analog: ProjectResource = {
  title: 'Analog Read Serial', source: 'Arduino', kind: 'tutorial',
  url: 'https://docs.arduino.cc/tutorials/uno-rev3-smd/AnalogReadSerial',
  note: 'Read and inspect analog input values while testing a sensor circuit.',
  steps: ['step-ldr-divider', 'step-behavior-preview'],
};
const references: Record<string, ProjectResource[]> = {
  'proj-smart-dustbin': [board, {
    title: 'Trash Can Project', source: 'Arduino Education', kind: 'tutorial',
    url: 'https://www.arduino.cc/education/smart-trash-can',
    note: 'Related self-opening-bin example. It uses a different sensor interface; follow EcoBuild’s pin map and power specification for this build.',
    steps: ['step-sonar-wiring', 'step-mechanical-linkage', 'step-circuit-simulation'],
  }, {
    title: 'Servo Motor Basics with Arduino', source: 'Arduino', kind: 'documentation',
    url: 'https://docs.arduino.cc/learn/electronics/servo-motors/',
    note: 'Servo control, connections and power considerations. Verify the specifications of your servo.',
    steps: ['step-power-rails', 'step-servo-wiring', 'step-mechanical-linkage'],
  }, {
    title: 'Toward Greener Smart Cities: A Critical Review of Classic and Machine-Learning-Based Algorithms for Smart Bin Collection',
    source: 'Electronics · MDPI', kind: 'research', year: 2024,
    url: 'https://www.mdpi.com/2079-9292/13/5/836',
    note: 'Research background on sensor-based waste collection. Broader systems research, not this prototype’s wiring guide.',
  }],
  'proj-night-light': [board, {
    title: 'Using a Photocell', source: 'Adafruit Learning System', kind: 'tutorial',
    url: 'https://learn.adafruit.com/photocells/using-a-photocell',
    note: 'How a photoresistor and resistor divider turn changing light into a measurable voltage.',
    steps: ['step-ldr-divider', 'step-behavior-preview'],
  }, analog, {
    title: 'An Automation System for Controlling Streetlights and Monitoring Objects Using Arduino',
    source: 'Sensors · MDPI', kind: 'research', year: 2018,
    url: 'https://www.mdpi.com/1424-8220/18/10/3178',
    note: 'Related LDR-based automatic lighting research at streetlight scale. Background reading; do not copy mains-voltage circuitry into this low-voltage build.',
  }],
};
const ultrasonic: ProjectResource = {
  title: 'Radar and servo', source: 'Arduino Project Hub · arohansenroy', kind: 'tutorial',
  url: 'https://projecthub.arduino.cc/arohansenroy/radar-and-servo-480b6f',
  note: 'A related HC-SR04 example for understanding trigger/echo timing. Its pin assignments and moving-sensor setup differ from this project.',
};
const tone: ProjectResource = {
  title: 'Play a Melody using the tone() function', source: 'Arduino', kind: 'tutorial',
  url: 'https://docs.arduino.cc/built-in-examples/digital/toneMelody/',
  note: 'Learn how to generate tones. Match your piezo or buzzer type to the appropriate drive circuit.',
};
references['proj-parking-indicator'] = [board, ultrasonic, tone];
references['proj-door-alert'] = [board, ultrasonic, tone];
references['proj-temperature-display'] = [board, {
  title: 'Using a DHTxx Sensor with Arduino', source: 'Adafruit Learning System', kind: 'tutorial',
  url: 'https://learn.adafruit.com/dht/using-a-dhtxx-sensor-with-arduino',
  note: 'Temperature/humidity sensor wiring and library setup. Select the correct DHT11 or DHT22 sensor type.',
}, {
  title: 'Monochrome OLED Breakouts', source: 'Adafruit Learning System', kind: 'tutorial',
  url: 'https://learn.adafruit.com/monochrome-oled-breakouts?view=all',
  note: 'Display wiring and graphics library examples. Confirm your module controller and I2C address.',
}];
references['proj-plant-monitor'] = [board, analog, {
  title: 'Simple Soil Moisture Sensor', source: 'Arduino Project Hub · nikolaiapalis', kind: 'tutorial',
  url: 'https://projecthub.arduino.cc/nikolaiapalis/simple-soil-moisture-sensor-ec23c7',
  note: 'Related analog soil sensing example. Calibrate dry/wet readings for your own probe and soil; sensor variants differ.',
}];
references['proj-obstacle-robot'] = [board, ultrasonic, {
  title: 'L298 dual full-bridge driver', source: 'STMicroelectronics', kind: 'documentation',
  url: 'https://www.st.com/en/motor-drivers/l298.html',
  note: 'Manufacturer documentation for the motor-driver IC. Module regulators, jumpers and motor supply limits must be checked separately.',
}];
references['proj-reaction-game'] = [board, tone, {
  title: 'How to Wire and Program a Button', source: 'Arduino', kind: 'tutorial',
  url: 'https://docs.arduino.cc/built-in-examples/digital/Button/',
  note: 'Button input and resistor wiring basics for the player controls. Keep the project’s actual pin map.',
}];
references['proj-night-light'].splice(2, 0, {
  title: 'All About LEDs', source: 'Adafruit Learning System', kind: 'tutorial',
  url: 'https://learn.adafruit.com/all-about-leds',
  note: 'LED polarity, forward voltage and current-limiting resistor fundamentals for the output stage.',
  steps: ['step-led-circuit'],
});
references['proj-smart-dustbin'].splice(2, 0, {
  ...ultrasonic, steps: ['step-sonar-wiring', 'step-circuit-simulation'],
});

export function getProjectResources(projectId: string): ProjectResource[] {
  return references[projectId] || [board, analog];
}
