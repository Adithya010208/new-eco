/** Built-in help only. Never writes to inventory, build progress or account data. */
export interface TroubleshootingTopic {
  id: string;
  title: string;
  keywords: string[];
  checks: string[];
  followUp: string;
  projectId?: string;
  href: string;
}

export const TROUBLESHOOTING_TOPICS: TroubleshootingTopic[] = [
  {
    id: 'power', title: 'Power, resets or an overheating component',
    keywords: ['power', 'reset', 'resets', 'restarts', 'overheating', 'hot', 'smoke', 'burning', 'short', 'brownout', 'supply', 'battery'],
    href: '/studio',
    checks: [
      'If a component is unusually hot, smells burnt or emits smoke, disconnect power and stop testing. Do not touch exposed hot components or reconnect a damaged battery.',
      'With power disconnected, inspect polarity, loose wires and accidental bridges between supply and ground. Compare the wiring with the project guide.',
      'Check your actual board and component supply specifications. Servo loads need the recipe’s separate regulated supply and common ground.',
      'If the Arduino resets only when the servo moves, remove the mechanical load and have a mentor check the supply capacity and wiring before continuing.',
    ],
    followUp: 'Keep power disconnected if damage or overheating is suspected. Share the component and supply model, what happened immediately before the fault, and a wiring photo with a mentor. Do not bypass protection or use mains-voltage circuits for this prototype.',
  },
  {
    id: 'servo', title: 'Dustbin lid / servo is not moving',
    keywords: ['servo', 'sg90', 'lid', 'dustbin', 'bin', 'motor'],
    projectId: 'proj-smart-dustbin', href: '/studio?project=proj-smart-dustbin',
    checks: [
      'Are you testing the physical build or the 3D preview? For the preview, open Simulation and use Approach Hand. The preview does not upload code to hardware.',
      'For hardware, disconnect power before inspecting wiring. Compare the servo signal and power connections with the recipe’s pin map.',
      'Use the recipe’s separate regulated servo supply and connect its ground to Arduino ground. Check the actual servo’s voltage and current requirements.',
      'Check that the hinge and linkage move freely. Test the servo with the linkage disconnected before reconnecting it; keep fingers clear of the moving lid.',
    ],
    followUp: 'Record whether the servo is silent, buzzing, or moving with the lid disconnected. Share the board/servo variant, supply rating, measured supply voltage and a wiring photo with a mentor. Avoid repeatedly powering a stalled servo.',
  },
  {
    id: 'sensor', title: 'Ultrasonic distance readings are wrong',
    keywords: ['ultrasonic', 'hc-sr04', 'sr04', 'sonar', 'echo', 'trig', 'distance', 'sensor'],
    projectId: 'proj-smart-dustbin', href: '/studio?project=proj-smart-dustbin',
    checks: [
      'For the 3D preview, use the virtual hand distance slider. Its distance value is illustrative and does not read a physical sensor.',
      'Disconnect hardware power and compare VCC, GND, Trigger and Echo with the project pin map and your uploaded sketch. Trigger and Echo are different signals.',
      'Check common ground and loose breadboard connections. Confirm voltage compatibility for your actual board and sensor variant before connecting Echo.',
      'Test a stationary, flat target facing the sensor. Inspect actual serial readings before adjusting the detection threshold.',
    ],
    followUp: 'Note whether the reading is always zero, fixed, or jumping. Capture serial output, target distance, board type and Trigger/Echo assignments. Compare these with the guide, then ask a mentor to review the wiring.',
  },
  {
    id: 'light', title: 'Night light / LED does not respond',
    keywords: ['ldr', 'photoresistor', 'night', 'light', 'led', 'dark', 'brightness', 'divider'],
    projectId: 'proj-night-light', href: '/studio?project=proj-night-light',
    checks: [
      'For the preview, open Simulation and lower ambient light. This project’s preview turns the LED on below the existing 40% threshold.',
      'For hardware, disconnect power. Check LED polarity and its series current-limiting resistor; compare the circuit with the guide’s LED wiring step.',
      'Check the LDR/10k resistor divider junction connects to A0, and compare the D9 LED connection with your sketch. Avoid placing both component leads in one connected breadboard row.',
      'Read A0 in the serial monitor while covering and uncovering the LDR. If readings change but the LED does not, inspect the output wiring and sketch threshold.',
    ],
    followUp: 'Record A0 readings in light and darkness, the resistor values, LED orientation and whether D9 changes state. These measurements help a mentor distinguish divider wiring from output or threshold issues.',
  },
  {
    id: 'studio', title: '3D Studio is blank, slow or stuck',
    keywords: ['3d', 'studio', 'canvas', 'blank', 'webgl', 'slow', 'lag', 'camera', 'simulation', 'stuck', 'controls'],
    href: '/studio',
    checks: [
      'Select Overview or Reset camera if the model moved out of view. Use Previous/Next to navigate the guide and the Simulation tab for behavior controls.',
      'If the model is blank, reload once and check whether your browser supports WebGL and hardware acceleration. Try a current desktop browser.',
      'If rendering is slow, exit expanded mode, close other graphics-heavy tabs and try a smaller window. Your guide text remains usable independently of rendering.',
      'The 3D preview illustrates circuit behavior. It does not connect to an Arduino, upload firmware, or verify that your physical build works.',
    ],
    followUp: 'Note the browser/version, device, project, failing step and any visible error. If another browser works, compare hardware acceleration settings. Share the error with a mentor rather than resetting inventory or build data.',
  },
  {
    id: 'inventory', title: 'Parts or project match seem incorrect',
    keywords: ['inventory', 'component', 'parts', 'missing', 'match', 'quantity', 'available', 'reserved', 'installed', 'passport'],
    href: '/components',
    checks: [
      'Check that you are viewing the intended demo maker or cloud account. Their inventories are separate.',
      'Compare Total, Available, Reserved and Installed quantities. A reserved or installed component is not a free part for another build.',
      'Review the component’s catalog type and condition. Faulty or unsafe parts do not contribute to working project coverage.',
      'Open Component Passport to inspect verification and history. Update a condition only after testing the real component.',
    ],
    followUp: 'Compare the project’s required quantity with your actual available working quantity. Keep reservations and installed quantities intact; review the relevant workspace or physical build record before changing them.',
  },
  {
    id: 'account', title: 'Sign-in or saved data is not working',
    keywords: ['login', 'log in', 'sign', 'auth', 'account', 'firebase', 'firestore', 'permission', 'save', 'saved', 'persist', 'cloud', 'data'],
    href: '/profile',
    checks: [
      'Check whether the header shows Demo or Account mode. Demo data stays in this browser; cloud data belongs to the signed-in Firebase account.',
      'Read the visible authentication error. Allow the normal Google sign-in popup and try again. Do not share passwords, tokens or API secrets in chat.',
      'For a deployed site, the site owner should verify Firebase web configuration and add the deployed hostname to Firebase Authentication’s authorized domains.',
      'If a cloud write is denied, keep the error text and affected action for the site owner. Do not weaken Firestore rules or reset demo data to fix cloud permissions.',
    ],
    followUp: 'Share only the error message, affected page, account/demo mode and whether this happens on localhost or the deployed site. Keep tokens and private credentials out of screenshots.',
  },
  {
    id: 'progress', title: 'Build completion or Eco Points question',
    keywords: ['points', 'rank', 'badge', 'leaderboard', 'complete', 'completion', 'progress', 'impact', 'ledger', 'reuse'],
    href: '/impact',
    checks: [
      'Completing the 3D learning guide records study progress. It does not verify a physical build or generate environmental impact.',
      'Review the physical build record and its reused components. Eco Points and impact come from the existing platform rules and recorded events.',
      'Check the active maker/account and whether the relevant completion was already recorded. Duplicate events do not earn points again.',
      'Inspect the Impact & Ledger page for recorded entries. Do not create a duplicate completion just to make a score update.',
    ],
    followUp: 'Collect the project name, completion record and relevant ledger entry. Ask the site owner or mentor to review those records if the displayed total still differs from the recorded events.',
  },
];

export function findTroubleshootingTopic(input: string): TroubleshootingTopic | undefined {
  const text = input.toLowerCase().replace(/[^\p{L}\p{N}-]+/gu, ' ');
  const words = new Set(text.split(' '));
  const matches = TROUBLESHOOTING_TOPICS.map(topic => ({ topic, score: topic.keywords.reduce((score, keyword) => score + (keyword.includes(' ') ? Number(text.includes(keyword)) : Number(words.has(keyword))), 0) }));
  matches.sort((a, b) => b.score - a.score);
  return matches[0]?.score > 0 ? matches[0].topic : undefined;
}
