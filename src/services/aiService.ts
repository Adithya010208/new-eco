/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ComponentCategory,
  ComponentCondition,
  ComponentSource,
  VerificationStatus,
  ProjectTemplate,
} from '../types';

export interface IntakeProposal {
  catalogId: string;
  name: string;
  category: ComponentCategory;
  quantity: number;
  condition: ComponentCondition;
  source: ComponentSource;
  unitMassGrams: number | null;
  verificationStatus: VerificationStatus;
  detectedText?: string;
  confidenceScore: number;
  notes: string;
  safetyWarning: string;
}

export interface DraftProjectRecipe {
  id: string;
  name: string;
  description: string;
  purpose: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedDuration: string;
  requiredCatalogIds: { catalogId: string; name: string; quantity: number }[];
  isDraftUnreviewed: true;
  salvageGuidance: string[];
  troubleshootingTips: string[];
  disclaimer: string;
}

export interface AIProviderStatus {
  isLiveAvailable: boolean;
  providerName: string;
  mode: 'deterministic-heuristic-fallback' | 'secure-backend-proxy';
  reason: string;
  remainingSetupRequirements: string[];
}

export const AIProviderService = {
  /**
   * Returns runtime AI availability status.
   * On Firebase Spark plan, Cloud Functions backend proxy cannot be provisioned without
   * upgrading to Blaze. Per security rules, API secrets are never embedded in client bundles.
   */
  getProviderStatus(): AIProviderStatus {
    return {
      isLiveAvailable: false,
      providerName: 'Google Gemini (Deterministic Security Fallback)',
      mode: 'deterministic-heuristic-fallback',
      reason:
        'Live backend proxy is unavailable on the Firebase Spark free plan. In accordance with zero-trust security policy, runtime API secrets are not bundled into frontend JavaScript. The system operates via deterministic rule-based natural language and OCR heuristic engines.',
      remainingSetupRequirements: [
        'A secured server-side backend or Cloud Run / Cloud Functions proxy with GEMINI_API_KEY stored in server environment secrets.',
        'Token authentication validating signed-in Firebase users before proxying requests to Google GenAI APIs.',
        'Strict rate limiting and response schemas to prevent prompt injection and unvalidated recipe generation.',
      ],
    };
  },

  /**
   * Natural Language Component Intake Parser.
   * Extracts catalog match, quantity, and source from unstructured maker notes.
   * Strictly enforces that verificationStatus defaults to 'untested' and condition is never assumed working.
   */
  parseNaturalLanguageIntake(input: string): IntakeProposal {
    const text = input.toLowerCase();

    // 1. Detect Quantity
    let quantity = 1;
    const qtyMatch = text.match(/(\d+)\s*(?:x|pcs|units|pieces|items)?/);
    if (qtyMatch) {
      const parsed = parseInt(qtyMatch[1], 10);
      if (parsed > 0 && parsed <= 500) {
        quantity = parsed;
      }
    } else {
      if (text.includes('two') || text.includes('pair')) quantity = 2;
      else if (text.includes('three')) quantity = 3;
      else if (text.includes('four')) quantity = 4;
      else if (text.includes('five')) quantity = 5;
    }

    // 2. Detect Catalog Match & Category
    let catalogId = 'custom-hardware';
    let name = 'Unidentified Salvaged Hardware';
    let category: ComponentCategory = 'other';
    let defaultMass: number | null = null;

    if (text.includes('arduino') || text.includes('uno') || text.includes('atmega328')) {
      catalogId = 'arduino-uno';
      name = 'Arduino Uno Rev3';
      category = 'microcontroller';
      defaultMass = 25;
    } else if (text.includes('esp32') || text.includes('nodemcu') || text.includes('esp8266')) {
      catalogId = 'esp32-devkit';
      name = 'ESP32 NodeMCU DevKit V1';
      category = 'microcontroller';
      defaultMass = 12;
    } else if (text.includes('ultrasonic') || text.includes('distance') || text.includes('hc-sr04') || text.includes('sr04')) {
      catalogId = 'hc-sr04';
      name = 'HC-SR04 Ultrasonic Distance Sensor';
      category = 'sensor';
      defaultMass = 9;
    } else if (text.includes('servo') || text.includes('sg90') || text.includes('micro servo')) {
      catalogId = 'sg90-servo';
      name = 'TowerPro SG90 9g Micro Servo';
      category = 'actuator';
      defaultMass = 11;
    } else if (text.includes('led') || text.includes('diode') || text.includes('lamp')) {
      catalogId = 'led-5mm';
      name = '5mm Diffused LEDs';
      category = 'passive';
      defaultMass = 0.3;
    } else if (text.includes('photoresistor') || text.includes('ldr') || text.includes('light sensor') || text.includes('gl5528')) {
      catalogId = 'ldr-gl5528';
      name = 'GL5528 Light Dependent Resistor';
      category = 'sensor';
      defaultMass = 0.8;
    } else if (text.includes('breadboard') || text.includes('proto board')) {
      catalogId = 'breadboard-half';
      name = 'Half-Size Breadboard (400-Point)';
      category = 'prototyping';
      defaultMass = 38;
    } else if (text.includes('wire') || text.includes('jumper') || text.includes('dupont')) {
      catalogId = 'jumper-wires';
      name = 'Jumper Wire Ribbon';
      category = 'prototyping';
      defaultMass = 30;
    } else if (text.includes('dht11') || text.includes('humidity') || text.includes('temp sensor')) {
      catalogId = 'dht11-sensor';
      name = 'DHT11 Temperature & Humidity Sensor';
      category = 'sensor';
      defaultMass = 5;
    } else if (text.includes('oled') || text.includes('i2c display') || text.includes('0.96')) {
      catalogId = 'oled-096-i2c';
      name = '0.96 inch I2C OLED Display';
      category = 'display';
      defaultMass = 8;
    } else if (text.includes('motor') || text.includes('gear motor') || text.includes('dc motor')) {
      catalogId = 'dc-motor-toy';
      name = '3V-6V Dual Shaft DC Gear Motor';
      category = 'actuator';
      defaultMass = 28;
    } else if (text.includes('l298') || text.includes('motor driver') || text.includes('h-bridge')) {
      catalogId = 'l298n-driver';
      name = 'L298N Dual H-Bridge Motor Driver';
      category = 'actuator';
      defaultMass = 26;
    } else if (text.includes('buzzer') || text.includes('piezo') || text.includes('beeper')) {
      catalogId = 'buzzer-piezo';
      name = '5V Active Piezo Buzzer';
      category = 'actuator';
      defaultMass = 4.5;
    } else if (text.includes('soil') || text.includes('moisture')) {
      catalogId = 'soil-sensor';
      name = 'Capacitive Soil Moisture Probe';
      category = 'sensor';
      defaultMass = 14;
    } else if (text.includes('resistor') && text.includes('10k')) {
      catalogId = 'resistor-10k';
      name = '10k Ohm 1/4W Resistors';
      category = 'passive';
      defaultMass = 0.2;
    } else if (text.includes('resistor') && (text.includes('220') || text.includes('330'))) {
      catalogId = 'resistor-220';
      name = '220 Ohm 1/4W Resistors';
      category = 'passive';
      defaultMass = 0.2;
    }

    // 3. Detect Source
    let source: ComponentSource = 'salvaged';
    if (text.includes('bought') || text.includes('purchased') || text.includes('amazon') || text.includes('store')) {
      source = 'purchased';
    } else if (text.includes('donat') || text.includes('gift') || text.includes('friend')) {
      source = 'donated';
    } else if (text.includes('old project') || text.includes('previous build') || text.includes('disassembled')) {
      source = 'previous-project';
    }

    // 4. Detect Condition Cues
    let condition: ComponentCondition = 'untested';
    if (text.includes('working') || text.includes('tested good') || text.includes('works fine')) {
      condition = 'working';
    } else if (text.includes('broken') || text.includes('fried') || text.includes('dead') || text.includes('faulty')) {
      condition = 'faulty';
    } else if (text.includes('burnt') || text.includes('smoke') || text.includes('swollen') || text.includes('hot') || text.includes('unsafe')) {
      condition = 'unsafe';
    }

    return {
      catalogId,
      name,
      category,
      quantity,
      condition,
      source,
      unitMassGrams: defaultMass,
      verificationStatus: 'untested', // AI NEVER auto-verifies physical electrical health!
      confidenceScore: catalogId === 'custom-hardware' ? 0.35 : 0.88,
      notes: `Extracted from text: "${input.slice(0, 150)}"`,
      safetyWarning:
        'Safety Notice: Automated natural language parsing suggests catalog classifications for convenience only. It cannot verify pinout integrity, internal short-circuits, or rated operating voltages. Physical verification required prior to project assembly.',
    };
  },

  /**
   * Photo / Optical OCR Component Identification Parser.
   * Simulates optical recognition of printed IC markings and silk-screens.
   * Explicitly warns that a photograph cannot establish electrical health.
   */
  parsePhotoOCRIntake(fileName: string, ocrText?: string): IntakeProposal {
    const combined = `${fileName} ${ocrText || ''}`.toLowerCase();
    const baseProposal = this.parseNaturalLanguageIntake(combined);

    return {
      ...baseProposal,
      detectedText: ocrText || fileName,
      verificationStatus: 'untested', // Strictly untested!
      safetyWarning:
        'Optical Inspection Limitation: A visual photograph or OCR scan identifies silk-screen text and package form-factor only. It CANNOT detect internal silicon latch-up, over-voltage ESD damage, or thermal degradation. Do not connect without meter verification.',
    };
  },

  /**
   * QR Code Passport Parser.
   * Resolves supported EcoBuild passport formats.
   */
  parsePassportQR(qrString: string): IntakeProposal | null {
    const trimmed = qrString.trim();

    // Format 1: URI/prefix: ecobuild:passport:v1:{catalogId}:{qty}
    if (trimmed.startsWith('ecobuild:passport:v1:')) {
      const parts = trimmed.split(':');
      const catalogId = parts[3] || 'custom-hardware';
      const quantity = parseInt(parts[4] || '1', 10) || 1;

      return {
        catalogId,
        name: `EcoBuild Passport Component (${catalogId})`,
        category: 'other',
        quantity: Math.max(1, quantity),
        condition: 'untested',
        source: 'salvaged',
        unitMassGrams: null,
        verificationStatus: 'untested',
        confidenceScore: 0.99,
        notes: `Scanned from valid EcoBuild QR Passport: ${trimmed}`,
        safetyWarning:
          'Passport scanned: Physical condition must be checked before powering in circuits.',
      };
    }

    // Format 2: JSON passport payload
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.catalogId && parsed.name) {
        return {
          catalogId: String(parsed.catalogId).slice(0, 100),
          name: String(parsed.name).slice(0, 150),
          category: parsed.category || 'other',
          quantity: Math.max(1, Number(parsed.quantity) || 1),
          condition: parsed.condition || 'untested',
          source: parsed.source || 'salvaged',
          unitMassGrams: Number(parsed.unitMassGrams) || null,
          verificationStatus: 'untested',
          confidenceScore: 0.95,
          notes: `Parsed from QR Passport JSON metadata.`,
          safetyWarning:
            'Passport verified: Please inspect solder terminals and bench test prior to live installation.',
        };
      }
    } catch {
      // Not a valid JSON QR
    }

    return null;
  },

  /**
   * Generates a Draft / Unreviewed Project Candidate based on candidate inventory parts.
   * Strictly labelled as draft/unreviewed.
   */
  generateDraftCandidateRecipe(
    availableCatalogIds: string[]
  ): DraftProjectRecipe | null {
    const hasMicro = availableCatalogIds.includes('arduino-uno') || availableCatalogIds.includes('esp32-devkit');
    const hasServo = availableCatalogIds.includes('sg90-servo');
    const hasDist = availableCatalogIds.includes('hc-sr04');
    const hasLdr = availableCatalogIds.includes('ldr-gl5528');
    const hasLed = availableCatalogIds.includes('led-5mm');
    const hasDht = availableCatalogIds.includes('dht11-sensor');
    const hasOled = availableCatalogIds.includes('oled-096-i2c');

    if (hasMicro && hasDht && hasOled) {
      return {
        id: `draft-env-monitor-${Date.now().toString(36)}`,
        name: 'Draft: Ambient Microclimate Display Station',
        description:
          'Experimental build combining a digital temperature/humidity sensor with an I2C OLED display for localized greenhouse or workbench telemetry.',
        purpose:
          'Visualizes ambient thermal fluctuations and humidity using salvaged low-power display modules.',
        category: 'Environmental Monitoring',
        difficulty: 'Intermediate',
        estimatedDuration: '40 mins',
        requiredCatalogIds: [
          { catalogId: 'arduino-uno', name: 'Arduino Uno Rev3', quantity: 1 },
          { catalogId: 'dht11-sensor', name: 'DHT11 Sensor', quantity: 1 },
          { catalogId: 'oled-096-i2c', name: '0.96 inch I2C OLED Display', quantity: 1 },
          { catalogId: 'jumper-wires', name: 'Jumper Wire Ribbon', quantity: 1 },
        ],
        isDraftUnreviewed: true,
        salvageGuidance: [
          'Verify I2C pullup resistors on the OLED breakout (typically 4.7kΩ onboard).',
          'Avoid routing high-current motor wires parallel to the I2C SDA/SCL lines to prevent bus lockups.',
        ],
        troubleshootingTips: [
          'If the OLED stays blank, run an I2C scanner sketch to confirm whether the device address is 0x3C or 0x3D.',
          'DHT11 sensor requires at least 1 second between consecutive read requests.',
        ],
        disclaimer:
          'UNREVIEWED DRAFT: This candidate was generated heuristically. It is not an officially verified EcoBuild laboratory recipe. Review electrical pinouts and voltage logic thresholds before assembling.',
      };
    }

    if (hasMicro && hasLdr && hasLed) {
      return {
        id: `draft-sunlight-meter-${Date.now().toString(36)}`,
        name: 'Draft: Solar Daylight Level Indicator',
        description:
          'Multi-level ambient light monitor using photoresistor voltage division to trigger progressive LED brightness levels.',
        purpose: 'Provides visual indication of window sunlight for plant care or solar battery charging windows.',
        category: 'Creative Projects',
        difficulty: 'Beginner',
        estimatedDuration: '25 mins',
        requiredCatalogIds: [
          { catalogId: 'arduino-uno', name: 'Arduino Uno Rev3', quantity: 1 },
          { catalogId: 'ldr-gl5528', name: 'GL5528 LDR', quantity: 1 },
          { catalogId: 'resistor-10k', name: '10k Ohm Resistor', quantity: 1 },
          { catalogId: 'led-5mm', name: '5mm LED', quantity: 2 },
          { catalogId: 'resistor-220', name: '220 Ohm Resistor', quantity: 2 },
        ],
        isDraftUnreviewed: true,
        salvageGuidance: [
          'Test LDR dark resistance (>1MΩ) vs direct light resistance (<500Ω) with a multimeter.',
          'Always insert current-limiting resistors in series with LEDs to protect the microcontroller output pins.',
        ],
        troubleshootingTips: [
          'If LED never turns off, invert the analog read threshold condition in your logic comparison.',
        ],
        disclaimer:
          'UNREVIEWED DRAFT: Community/experimental recipe proposal. Verify pin current budgets against microcontroller datasheet.',
      };
    }

    return null;
  },
};
