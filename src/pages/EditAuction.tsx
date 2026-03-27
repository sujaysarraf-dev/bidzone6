/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { store } from "../store";
import { AssetType, AuctionStatus } from "../types";
import { 
  ArrowLeft, 
  Upload, 
  MapPin, 
  Calendar, 
  DollarSign,
  Info,
  AlertCircle
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "react-hot-toast";

export default function EditAuction() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | undefined>(undefined);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assetType: AssetType.REAL_ESTATE,
    basePrice: "",
    reservePrice: "",
    endTime: "",
    address: "",
    latitude: "27.7172",
    longitude: "85.3240",
  });
  const [images, setImages] = useState<string[]>([]);
  const [documents, setDocuments] = useState<{name: string, url: string}[]>([]);

  useEffect(() => {
    const init = async () => {
      const u = store.getUser();
      if (u && u.isVerified === false) {
        toast.error("Account verification pending.");
        navigate("/dashboard");
      }
      setIsVerified(u?.isVerified);

      if (id) {
        const auction = store.getAuctionById(id);
        if (auction) {
          setFormData({
            title: auction.title,
            description: auction.description,
            assetType: auction.assetType,
            basePrice: auction.basePrice.toString(),
            reservePrice: auction.reservePrice.toString(),
            endTime: new Date(auction.endTime).toISOString().slice(0, 16),
            address: auction.location.address,
            latitude: auction.location.latitude.toString(),
            longitude: auction.location.longitude.toString(),
          });
          setImages(auction.images);
          setDocuments(auction.documents);
        }
      }
    };
    init();

    window.addEventListener('store-updated', init);
    return () => window.removeEventListener('store-updated', init);
  }, [id, navigate]);

  if (isVerified === false) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!id) return;
      await store.updateAuction(id, {
        title: formData.title,
        description: formData.description,
        assetType: formData.assetType,
        basePrice: Number(formData.basePrice),
        reservePrice: Number(formData.reservePrice),
        endTime: new Date(formData.endTime).toISOString(),
        location: {
          address: formData.address,
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude),
        },
        images: images,
        documents: documents,
      });
      
      toast.success("Auction updated successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to update auction", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 mb-8 transition-colors"
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden"
        >
          <div className="p-8 md:p-12 border-b border-neutral-100">
            <h1 className="text-3xl font-bold tracking-tight">Edit Auction</h1>
            <p className="text-neutral-500 mt-2">Modify the details of your auction listing.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-8">
            {/* Basic Info */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 text-neutral-900 font-bold">
                <Info size={20} />
                <h3>Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-700">Auction Title</label>
                  <input 
                    required
                    type="text"
                    placeholder="e.g. Prime Commercial Land in Kathmandu"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-700">Description</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="Provide detailed information about the asset..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-700">Asset Type</label>
                    <select 
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                      value={formData.assetType}
                      onChange={e => setFormData({...formData, assetType: e.target.value as AssetType})}
                    >
                      {Object.values(AssetType).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-700">End Date & Time</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                      <input 
                        required
                        type="datetime-local"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                        value={formData.endTime}
                        onChange={e => setFormData({...formData, endTime: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 text-neutral-900 font-bold">
                <DollarSign size={20} />
                <h3>Pricing Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-700">Base Price (NPR)</label>
                  <input 
                    required
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                    value={formData.basePrice}
                    onChange={e => setFormData({...formData, basePrice: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-700">Reserve Price (NPR)</label>
                  <input 
                    required
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                    value={formData.reservePrice}
                    onChange={e => setFormData({...formData, reservePrice: e.target.value})}
                  />
                </div>
              </div>
            </section>

            {/* Location */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 text-neutral-900 font-bold">
                <MapPin size={20} />
                <h3>Location Details</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-700">Full Address</label>
                  <input 
                    required
                    type="text"
                    placeholder="e.g. Durbar Marg, Kathmandu"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-700">Latitude</label>
                    <input 
                      type="text"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                      value={formData.latitude}
                      onChange={e => setFormData({...formData, latitude: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-700">Longitude</label>
                    <input 
                      type="text"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                      value={formData.longitude}
                      onChange={e => setFormData({...formData, longitude: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Media */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 text-neutral-900 font-bold">
                <Upload size={20} />
                <h3>Media & Documents</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.multiple = true;
                    input.onchange = async (e: any) => {
                      const files = Array.from(e.target.files) as File[];
                      if (files.length > 0) {
                        try {
                          // Show local previews immediately
                          const localUrls = files.map(f => URL.createObjectURL(f));
                          setImages(prev => [...prev, ...localUrls]);

                          const uploadPromises = files.map(file => store.uploadImage(file, file.name));
                          toast.promise(Promise.all(uploadPromises), {
                            loading: 'Uploading images...',
                            success: (urls) => {
                              // Replace local blob URLs with real Supabase URLs
                              setImages(prev => {
                                const filtered = prev.filter(url => !url.startsWith('blob:'));
                                return [...filtered, ...urls];
                              });
                              return `${files.length} images uploaded!`;
                            },
                            error: (err) => {
                              // Remove the local blobs if failed
                              setImages(prev => prev.filter(url => !url.startsWith('blob:')));
                              return `Failed: ${err.message || 'Check connection'}`;
                            }
                          });
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    };
                    input.click();
                  }}
                  className="border-2 border-dashed border-neutral-200 rounded-[2rem] p-8 text-center hover:border-neutral-900 transition-colors cursor-pointer relative"
                >
                  <Upload className="mx-auto mb-4 text-neutral-400" size={32} />
                  <p className="text-sm font-bold">Upload Images</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {images.length > 0 ? `${images.length} images ready` : 'PNG, JPG up to 10MB'}
                  </p>
                </div>
                <div 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.pdf,.doc,.docx';
                    input.onchange = async (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          toast.promise(store.uploadImage(file, file.name), {
                            loading: `Uploading ${file.name}...`,
                            success: (url) => {
                              setDocuments(prev => [...prev, { name: file.name, url }]);
                              return `${file.name} uploaded!`;
                            },
                            error: 'Failed to upload document'
                          });
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    };
                    input.click();
                  }}
                  className="border-2 border-dashed border-neutral-200 rounded-[2rem] p-8 text-center hover:border-neutral-900 transition-colors cursor-pointer"
                >
                  <Upload className="mx-auto mb-4 text-neutral-400" size={32} />
                  <p className="text-sm font-bold">Upload Documents</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {documents.length > 0 ? `${documents.length} docs ready` : 'PDF, DOC up to 20MB'}
                  </p>
                </div>
              </div>
              {images.length > 0 && (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-4 mt-6">
                  {images.map((url, i) => (
                    <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-neutral-200 bg-white">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {!url.startsWith('blob:') && (
                        <button 
                          type="button"
                          onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      )}
                      {url.startsWith('blob:') && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="pt-8 border-t border-neutral-100">
              <button 
                disabled={loading}
                type="submit"
                className="w-full btn-primary py-4 text-lg shadow-xl shadow-emerald-500/20 disabled:opacity-50"
              >
                {loading ? "Updating Auction..." : "Save Changes"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
