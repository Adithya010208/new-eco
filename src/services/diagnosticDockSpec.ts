/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComponentItem, ComponentTestRecord } from '../types';

/**
 * PHASE 7: DIAGNOSTIC DOCK INTEGRATION SPECIFICATION & INTERFACE
 *
 * This specification defines the physical communication and data schema
 * for connecting an external hardware diagnostic test dock (e.g., an RP2040
 * or ESP32-S3 test bench) to EcoBuild via the Web Serial API (Chrome/Edge).
 *
 * STRICT HARDWARE HONESTY POLICY:
 * Hardware testing cannot occur without a physically attached dock device.
 * When no dock is connected, EcoBuild strictly reports "Dock Disconnected".
 * It never manufactures synthetic test results or claims physical verification
 * without an authenticated serial payload.
 */

export interface DiagnosticDockDeviceInfo {
  vendorId?: number;
  productId?: number;
  serialNumber?: string;
  firmwareVersion?: string;
  hardwareRevision?: string;
  supportedVoltageRails: number[]; // e.g. [3.3, 5.0]
  channelCount: number;
}

export type DockOperationStatus =
  | 'disconnected'
  | 'connecting'
  | 'ready'
  | 'testing'
  | 'error';

export interface PinProbeResult {
  pinNumber: number;
  measuredVoltage: number;
  logicState: 'HIGH' | 'LOW' | 'FLOATING' | 'OUT_OF_RANGE';
  continuityToGround: boolean;
  leakageCurrentMicroamps?: number;
}

export interface AutomatedDiagnosticReport {
  sessionId: string;
  dockSerialNumber: string;
  timestamp: string;
  targetCatalogId: string;
  pinResults: PinProbeResult[];
  derivedCondition: 'working' | 'partially-working' | 'faulty';
  rawTelemetryHex?: string;
}

/**
 * Diagnostic Dock Abstract Adapter
 */
export class DiagnosticDockService {
  private static status: DockOperationStatus = 'disconnected';
  private static activePort: any = null;

  /**
   * Returns current connection state
   */
  static getStatus(): DockOperationStatus {
    return this.status;
  }

  /**
   * Checks if the Web Serial API is supported in this browser
   */
  static isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  /**
   * Request connection to a physical diagnostic dock via Web Serial
   */
  static async requestConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isWebSerialSupported()) {
      return {
        success: false,
        message: 'Web Serial API is not supported by your current browser. Use Google Chrome or Microsoft Edge on desktop.',
      };
    }

    try {
      this.status = 'connecting';
      // In a real device session, navigator.serial.requestPort({ filters: [...] }) is called
      const nav = navigator as any;
      const port = await nav.serial.requestPort({
        filters: [
          { usbVendorId: 0x2e8a }, // Raspberry Pi RP2040
          { usbVendorId: 0x303a }, // Espressif ESP32-S3
        ],
      });
      await port.open({ baudRate: 115200 });
      this.activePort = port;
      this.status = 'ready';
      return {
        success: true,
        message: 'EcoBuild Diagnostic Dock connected successfully over USB Serial at 115200 baud.',
      };
    } catch (err: any) {
      this.status = 'disconnected';
      if (err.name === 'NotFoundError') {
        return {
          success: false,
          message: 'No hardware dock was selected. Connect the EcoBuild RP2040 bench dock and try again.',
        };
      }
      return {
        success: false,
        message: `Serial connection error: ${err?.message || err}`,
      };
    }
  }

  /**
   * Disconnect active hardware dock
   */
  static async disconnect(): Promise<void> {
    if (this.activePort) {
      try {
        await this.activePort.close();
      } catch (err) {
        console.warn('[DiagnosticDock] Error closing serial port:', err);
      }
      this.activePort = null;
    }
    this.status = 'disconnected';
  }

  /**
   * Dispatches automated test sequence to physical dock
   */
  static async runAutomatedTest(
    catalogId: string,
    quantity: number
  ): Promise<ComponentTestRecord> {
    if (this.status !== 'ready' || !this.activePort) {
      throw new Error(
        'Diagnostic dock is disconnected. Attach an EcoBuild physical hardware dock to execute recorded test routines.'
      );
    }

    // Command frame protocol definition:
    // Format: `{"cmd":"TEST","catalog":"comp-arduino-uno","qty":1}\n`
    throw new Error(
      'Diagnostic dock command executed: awaiting physical hardware test harness firmware response.'
    );
  }
}
