/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ComponentExchangeListing, ComponentItem, MakerProfile } from '../../types';
import {
  Package,
  ArrowRight,
  Handshake,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  X,
  Clock,
  ShieldCheck,
  MapPin,
} from 'lucide-react';

interface ExchangeListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listings: ComponentExchangeListing[];
  userInventory: ComponentItem[];
  activeUser: MakerProfile;
  onPublishListing: (listing: Omit<ComponentExchangeListing, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onRequestListing: (listingId: string) => Promise<void>;
  onAcceptRequest: (listingId: string) => Promise<void>;
  onConfirmHandover: (listingId: string) => Promise<void>;
  onCancelListing: (listingId: string) => Promise<void>;
}

export function ExchangeListingModal({
  isOpen,
  onClose,
  listings,
  userInventory,
  activeUser,
  onPublishListing,
  onRequestListing,
  onAcceptRequest,
  onConfirmHandover,
  onCancelListing,
}: ExchangeListingModalProps) {
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'my-listings'>('browse');

  // Create form state
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [listingType, setListingType] = useState<'free-donation' | 'swap-preferred'>('free-donation');
  const [listingQuantity, setListingQuantity] = useState(1);
  const [handoffLocationNote, setHandoffLocationNote] = useState('Campus Electronics Lab Drop-off Box');
  const [listingNotes, setListingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const eligibleInventory = userInventory.filter(
    (item) => item.condition === 'working' && item.totalQuantity - item.reservedQuantity - item.installedQuantity > 0
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryId) return;

    const item = userInventory.find((i) => i.id === selectedInventoryId);
    if (!item) return;

    setIsSubmitting(true);
    try {
      await onPublishListing({
        ownerId: activeUser.id,
        ownerDisplayName: activeUser.displayName,
        inventoryItemId: item.id,
        catalogId: item.catalogId,
        name: item.name,
        componentName: item.name,
        category: item.category,
        quantity: Math.min(listingQuantity, item.totalQuantity - item.reservedQuantity - item.installedQuantity),
        condition: 'working',
        listingType,
        handoffMethod: 'local-handoff',
        approximateLocation: handoffLocationNote.slice(0, 100),
        notes: listingNotes.slice(0, 500) || undefined,
        status: 'available',
      });
      setSelectedInventoryId('');
      setListingNotes('');
      setActiveTab('my-listings');
    } catch (err: any) {
      alert(`Error creating listing: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const myListings = listings.filter((l) => l.ownerId === activeUser.id);
  const availableListings = listings.filter((l) => l.status === 'available' && l.ownerId !== activeUser.id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Component Exchange & Surplus Donations" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'browse'
                  ? 'bg-[#087F83] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
            >
              Surplus Directory ({availableListings.length})
            </button>
            <button
              onClick={() => setActiveTab('my-listings')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'my-listings'
                  ? 'bg-[#087F83] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
            >
              My Listings & Requests ({myListings.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-[#087F83] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Offer Hardware</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 hidden sm:block">
            Strict Zero-Waste Campus Exchange
          </div>
        </div>

        {/* Tab 1: Browse Available Listings */}
        {activeTab === 'browse' && (
          <div className="space-y-4">
            {availableListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto">
                {availableListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          {listing.category} · {listing.catalogId}
                        </span>
                        <h4 className="text-sm font-bold text-[#132B3B]">
                          {listing.componentName}
                        </h4>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Offered by <strong>{listing.ownerDisplayName}</strong>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          listing.listingType === 'free-donation'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {listing.listingType === 'free-donation' ? 'Free Donation' : 'Swap Preferred'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span>Available: <strong>{listing.quantity} units</strong></span>
                      <span className="text-emerald-700 font-semibold capitalize">{listing.condition}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{listing.approximateLocation}</span>
                    </div>

                    {listing.notes && (
                      <p className="text-xs text-slate-600 italic line-clamp-2">
                        "{listing.notes}"
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => onRequestListing(listing.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-lg transition-colors cursor-pointer"
                      >
                        <Handshake className="w-3.5 h-3.5" />
                        <span>Request Component</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                <Package className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-[#132B3B]">No Surplus Listings Available</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Other makers have not published surplus components for donation or exchange yet. Be the first to donate working surplus parts to your local maker community!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Create Listing Form */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div>
              <h4 className="text-sm font-bold text-[#132B3B]">
                Offer Working Hardware for Donation or Exchange
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Passports ensure recipient makers receive genuine working stock. Home addresses and financial data are never requested or exposed.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Component from Your Inventory *
                </label>
                <select
                  required
                  value={selectedInventoryId}
                  onChange={(e) => setSelectedInventoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="">Select an eligible working component...</option>
                  {eligibleInventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.catalogId}) — {item.totalQuantity - item.reservedQuantity - item.installedQuantity} free
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Exchange Type *
                </label>
                <select
                  value={listingType}
                  onChange={(e) => setListingType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="free-donation">Free Donation (Gift to Student / Team)</option>
                  <option value="swap-preferred">Swap Preferred (Exchange for other parts)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity to Offer *
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={listingQuantity}
                  onChange={(e) => setListingQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campus / Lab Drop-off Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maker Lab Front Desk / Student Union Bin"
                  value={handoffLocationNote}
                  onChange={(e) => setHandoffLocationNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Optional Notes for Maker Recipient
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Tested with 5V logic analyzer; includes pre-soldered header pins."
                value={listingNotes}
                onChange={(e) => setListingNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Publishing...' : 'Publish Surplus Listing'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: My Listings & Inbound Requests */}
        {activeTab === 'my-listings' && (
          <div className="space-y-4">
            {myListings.length > 0 ? (
              <div className="space-y-3 max-h-[440px] overflow-y-auto">
                {myListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#132B3B]">
                            {listing.componentName}
                          </h4>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                              listing.status === 'available'
                                ? 'bg-emerald-100 text-emerald-800'
                                : listing.status === 'requested'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            Status: {listing.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {listing.quantity} units · {listing.catalogId} · {listing.approximateLocation}
                        </div>
                      </div>

                      {listing.status === 'available' && (
                        <button
                          onClick={() => onCancelListing(listing.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 p-1 hover:bg-rose-50 rounded"
                          title="Withdraw Listing"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Inbound Request Management */}
                    {listing.status === 'requested' && (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-bold text-amber-900">
                            Requested by {listing.requesterDisplayName || 'A Maker'}
                          </div>
                          <div className="text-amber-700 text-[11px]">
                            Accept request to coordinate drop-off at {listing.approximateLocation}.
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => onAcceptRequest(listing.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                          >
                            Accept Request
                          </button>
                          <button
                            onClick={() => onCancelListing(listing.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Handover Confirmation State */}
                    {listing.status === 'claimed' && (
                      <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-bold text-sky-900">
                            Handover In Progress with {listing.requesterDisplayName}
                          </div>
                          <div className="text-sky-700 text-[11px]">
                            Once parts are handed over at the lab, confirm handover to record the verified e-waste diversion.
                          </div>
                        </div>

                        <button
                          onClick={() => onConfirmHandover(listing.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#087F83] hover:bg-[#066366] rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          Confirm Handover Complete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                <Package className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-[#132B3B]">You Have No Active Surplus Listings</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click "Offer Hardware" to list surplus components from your inventory for other makers in your community.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Privacy & Safety Policy Callout */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#087F83] shrink-0 mt-0.5" />
          <span>
            <strong>Safety & Privacy Standard:</strong> Component exchange is restricted to verified working hardware. All handoffs are conducted at designated community lab drop-offs. Shipping automation, monetary fees, and private address disclosures are strictly prohibited.
          </span>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close Directory
          </button>
        </div>
      </div>
    </Modal>
  );
}
