/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuctionListing, UserProfile, Notification, UserRole, UserStatus, AuctionStatus, SystemSettings } from "./types";
import {
  auctionService,
  profileService,
  notificationService,
  storageService,
  inquiryService,
} from "./services/supabaseService";
import { supabase } from "./services/supabase";
import { toast } from "react-hot-toast";
import { MOCK_AUCTIONS } from "./constants";


// Initial state
const INITIAL_USER: UserProfile | null = null;

const INITIAL_SETTINGS: SystemSettings = {
  categories: ["Real Estate", "Vehicle", "Machinery", "Financial Asset", "Other"],
  currencies: ["NPR", "USD", "INR"],
  timeZones: ["Asia/Kathmandu", "UTC", "Asia/Kolkata"],
  notificationTemplates: {
    "outbid": "You have been outbid on {auctionTitle}. Current bid is {currency} {amount}.",
    "won": "Congratulations! You won the auction for {auctionTitle}.",
    "new_listing": "A new {assetType} has been listed: {auctionTitle}."
  }
};

const INITIAL_NOTIFICATIONS: Notification[] = [];

const INITIAL_USER_BIDS: Record<string, number> = {};

const DEMO_USERS: Record<string, UserProfile> = {
  "buyer@demo.com": {
    uid: "00000000-0000-4000-8888-000000000001",
    email: "buyer@demo.com",
    displayName: "Demo Buyer",
    role: UserRole.BUYER,
    status: UserStatus.ACTIVE,
    createdAt: new Date().toISOString(),
  },
  "institution@demo.com": {
    uid: "00000000-0000-4000-8888-000000000002",
    email: "institution@demo.com",
    displayName: "Demo Institution",
    role: UserRole.INSTITUTION,
    status: UserStatus.ACTIVE,
    institutionName: "Demo Nepal Bank",
    createdAt: new Date().toISOString(),
  },
  "admin@demo.com": {
    uid: "00000000-0000-4000-8888-000000000003",
    email: "admin@demo.com",
    displayName: "Platform Admin",
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: new Date().toISOString(),
  },
  "google@demo.com": {
    uid: "00000000-0000-4000-8888-000000000004",
    email: "google@demo.com",
    displayName: "Google Test User",
    role: UserRole.BUYER,
    status: UserStatus.ACTIVE,
    photoURL: "https://lh3.googleusercontent.com/a/default-user",
    createdAt: new Date().toISOString(),
  }
};

class Store {
  private auctions: AuctionListing[] = [];
  private user: UserProfile | null = null;
  private notifications: Notification[] = [];
  private userBids: Record<string, number> = {}; // auctionId -> maxBid
  private bidHistory: any[] = []; // Full bid history
  private auditLogs: { id: string; action: string; details: string; timestamp: string }[] = [];
  private users: UserProfile[] = [];
  private settings: SystemSettings = INITIAL_SETTINGS;

  constructor() {
    this.loadFromStorage();
    this.init();
    this.setupAuthListener();
  }

  private setupAuthListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          // Get profile from our profiles table
          const profile = await profileService.getProfile(session.user.id);
          if (profile) {
            this.user = profile;
          } else {
            // Create profile if it doesn't exist (e.g. first time Google login)
            const newProfile: UserProfile = {
              uid: session.user.id,
              email: session.user.email || "",
              displayName: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || "User",
              photoURL: session.user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`,
              role: UserRole.BUYER, // Default role
              status: UserStatus.ACTIVE,
              createdAt: new Date().toISOString(),
            };
            await profileService.upsertProfile(newProfile);
            this.user = newProfile;
          }
          this.saveUser();
          this.init(); // Refresh data for the logged in user
        } catch (error) {
          console.error("Error setting up user profile:", error);
        }
      } else if (event === 'SIGNED_OUT') {
        this.user = null;
        localStorage.removeItem("bidzone_user");
        localStorage.removeItem("bidzone_user_bids");
        localStorage.removeItem("bidzone_notifications");
      }
      window.dispatchEvent(new CustomEvent('store-updated'));
    });
  }

  async init() {
    try {
      // Try to fetch from Supabase, fallback to mocks if it fails
      try {
        const fetchAuctions = await auctionService.getAllAuctions();
        if (fetchAuctions && fetchAuctions.length > 0) {
          this.auctions = fetchAuctions;
        } else {
          // If Supabase returns empty but we have nothing, use mocks
          if (this.auctions.length === 0) this.auctions = MOCK_AUCTIONS;
        }
      } catch (error) {
        console.error("Failed to fetch from Supabase, using mock data:", error);
        if (this.auctions.length === 0) this.auctions = MOCK_AUCTIONS;
      }
      
      this.saveAuctions();

      if (this.user) {
        // Only fetch from Supabase if the UID is a real UUID and not a demo UID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.user.uid);
        const isDemoEmail = this.user.email.includes("@demo.com");

        if (isUuid && !isDemoEmail) {
          try {
            const notifications = await notificationService.getNotifications(this.user.uid);
            this.notifications = notifications;
            this.saveNotifications();

            // Fetch user's bids
            const { data: bids, error: bidsError } = await supabase
              .from('bids')
              .select('auction_id, amount')
              .eq('bidder_id', this.user.uid);

            if (!bidsError && bids) {
              const userBids: Record<string, number> = {};
              bids.forEach(b => {
                if (!userBids[b.auction_id] || b.amount > userBids[b.auction_id]) {
                  userBids[b.auction_id] = b.amount;
                }
              });
              this.userBids = userBids;
              this.saveUserBids();
            }

            // Fetch full bid history
            const history = await auctionService.getBidsByUserId(this.user.uid);
            this.bidHistory = history;
            this.saveBidHistory();
          } catch (e) {
            console.error("Supabase data fetch failed for logged in user:", e);
          }
        } else if (isDemoEmail) {
           // For demo users, ensure they have some default "active bids" to see something in dashboard
           if (Object.keys(this.userBids).length === 0 && this.auctions.length > 0) {
             // Mock one active bid for the demo user
             const firstAuctionId = this.auctions[0].id;
             this.userBids[firstAuctionId] = this.auctions[0].currentBid;
             this.saveUserBids();
           }
        }
      }

      try {
        const users = await profileService.getAllProfiles();
        if (users && users.length > 0) {
          this.users = users;
          this.saveUsers();
        }
      } catch (e) {
        console.error("Failed to fetch profiles:", e);
      }

      window.dispatchEvent(new CustomEvent('store-updated'));
    } catch (error) {
      console.error("Critical error in store init:", error);
    }
  }

  private loadFromStorage() {
    const savedAuctions = localStorage.getItem("bidzone_auctions");
    const savedUser = localStorage.getItem("bidzone_user");
    const savedNotifications = localStorage.getItem("bidzone_notifications");
    const savedUserBids = localStorage.getItem("bidzone_user_bids");
    const savedBidHistory = localStorage.getItem("bidzone_bid_history");

    this.auctions = savedAuctions ? JSON.parse(savedAuctions) : [];
    this.user = savedUser ? JSON.parse(savedUser) : null;
    this.notifications = savedNotifications ? JSON.parse(savedNotifications) : [];
    this.userBids = savedUserBids ? JSON.parse(savedUserBids) : {};
    this.bidHistory = savedBidHistory ? JSON.parse(savedBidHistory) : [];
    this.auditLogs = JSON.parse(localStorage.getItem("bidzone_audit_logs") || "[]");
    this.users = JSON.parse(localStorage.getItem("bidzone_users") || "[]");
    this.settings = JSON.parse(localStorage.getItem("bidzone_settings") || JSON.stringify(INITIAL_SETTINGS));
  }

  private saveAuctions() {
    localStorage.setItem("bidzone_auctions", JSON.stringify(this.auctions));
  }

  private saveUser() {
    localStorage.setItem("bidzone_user", JSON.stringify(this.user));
  }

  private saveNotifications() {
    localStorage.setItem("bidzone_notifications", JSON.stringify(this.notifications));
  }

  private saveUserBids() {
    localStorage.setItem("bidzone_user_bids", JSON.stringify(this.userBids));
  }

  private saveBidHistory() {
    localStorage.setItem("bidzone_bid_history", JSON.stringify(this.bidHistory));
  }

  private saveAuditLogs() {
    localStorage.setItem("bidzone_audit_logs", JSON.stringify(this.auditLogs));
  }

  private saveUsers() {
    localStorage.setItem("bidzone_users", JSON.stringify(this.users));
  }

  private saveSettings() {
    localStorage.setItem("bidzone_settings", JSON.stringify(this.settings));
  }

  async getAuctions() {
    if (this.auctions.length === 0) {
      try {
        const fetchAuctions = await auctionService.getAllAuctions();
        this.auctions = (fetchAuctions && fetchAuctions.length > 0) ? fetchAuctions : MOCK_AUCTIONS;
      } catch (e) {
        this.auctions = MOCK_AUCTIONS;
      }
      this.saveAuctions();
    }
    return this.auctions;
  }

  getAuctionById(id: string) {
    return this.auctions.find(a => a.id === id);
  }

  async placeBid(auctionId: string, amount: number) {
    if (!this.user) return { success: false, message: "Must be logged in to bid" };

    const auction = this.auctions.find(a => a.id === auctionId);
    if (!auction) return { success: false, message: "Auction not found" };

    if (amount <= auction.currentBid) {
      return { success: false, message: "Bid must be higher than current bid" };
    }

    try {
      await auctionService.placeBid(auctionId, this.user.uid, this.user.displayName, amount);

      auction.currentBid = amount;
      auction.bidCount += 1;
      this.saveAuctions();
      this.userBids[auctionId] = amount;
      this.saveUserBids();

      this.addNotification({
        title: "Bid Placed Successfully",
        message: `Your bid of NPR ${amount.toLocaleString()} for "${auction.title}" has been placed.`,
        type: "won",
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to place bid:", error);
      return { success: false, message: "Failed to place bid on server" };
    }
  }

  async createAuction(data: Omit<AuctionListing, "id" | "bidCount" | "currentBid" | "createdAt">) {
    try {
      const newAuction = await auctionService.createAuction(data);
      this.auctions = [newAuction, ...this.auctions];
      this.saveAuctions();
      this.addAuditLog("Auction Created", `New auction "${newAuction.title}" created by ${newAuction.institutionName}`);
      return newAuction;
    } catch (error) {
      console.error("Failed to create auction:", error);
      throw error;
    }
  }

  async updateAuction(id: string, data: Partial<AuctionListing>) {
    try {
      const updatedAuction = await auctionService.updateAuction(id, data);
      const idx = this.auctions.findIndex(a => a.id === id);
      if (idx !== -1) {
        this.auctions[idx] = updatedAuction;
        this.saveAuctions();
      }
      this.addAuditLog("Auction Updated", `Auction "${updatedAuction.title}" updated`);
      return updatedAuction;
    } catch (error) {
      console.error("Failed to update auction:", error);
      throw error;
    }
  }

  async moderateAuction(id: string, status: AuctionStatus) {
    const auction = this.auctions.find(a => a.id === id);
    if (auction) {
      try {
        await auctionService.updateAuctionStatus(id, status);
        auction.status = status;
        this.saveAuctions();
        this.addAuditLog("Auction Moderated", `Auction "${auction.title}" status updated to ${status}`);
        window.dispatchEvent(new CustomEvent('store-updated'));
      } catch (error) {
        console.error("Failed to moderate auction:", error);
      }
    }
  }

  getUser() {
    return this.user;
  }

  async login(email: string, password?: string) {
    try {
      if (password) {
        // Shorthand for admin login
        if (email === "admin" && password === "admin") {
           const adminProfile = DEMO_USERS["admin@demo.com"];
           this.user = adminProfile;
           this.saveUser();
           await this.init();
           window.dispatchEvent(new CustomEvent('store-updated'));
           return { success: true, user: this.user };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          // Fallback: If email is not confirmed, try to log in via local profile
          // This allows development to continue without mandatory email confirmation
          if (error.message.toLowerCase().includes("email not confirmed")) {
            const profile = await profileService.getProfileByEmail(email);
            if (profile) {
              this.user = profile;
              this.saveUser();
              await this.init();
              window.dispatchEvent(new CustomEvent('store-updated'));
              return { success: true, user: this.user };
            }
          }
          throw error;
        }

        if (data.user) {
          const profile = await profileService.getProfile(data.user.id);
          this.user = profile;
          this.saveUser();
        }
      } else {
        if (DEMO_USERS[email]) {
          const profile = DEMO_USERS[email];
          this.user = profile;
          this.saveUser();

          if (!this.users.some(u => u.uid === profile.uid)) {
            this.users.push(profile);
            this.saveUsers();
          }
        } else {
          const profile = this.users.find(p => p.email === email);
          if (profile) {
            this.user = profile;
            this.saveUser();
          }
        }
      }

      if (this.user) {
        await this.init();
        window.dispatchEvent(new CustomEvent('store-updated'));
        return { success: true, user: this.user };
      }

      return { success: false, message: "User not found" };
    } catch (error: any) {
      console.error("Login failed:", error);
      return { success: false, message: error.message };
    }
  }

  async signup(email: string, password: string, profileData: Partial<UserProfile>) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: profileData.displayName,
          }
        }
      });

      if (error) throw error;
      if (data.user) {
        const newProfile: UserProfile = {
          uid: data.user.id,
          email: email,
          displayName: profileData.displayName || email.split('@')[0],
          role: profileData.role || UserRole.BUYER,
          status: UserStatus.ACTIVE,
          phoneNumber: profileData.phoneNumber,
          institutionName: profileData.institutionName,
          createdAt: new Date().toISOString(),
        };
        await profileService.upsertProfile(newProfile);
        this.user = newProfile;
        this.saveUser();
        await this.init();
        window.dispatchEvent(new CustomEvent('store-updated'));
        return { success: true, user: newProfile };
      }
      return { success: false, message: "Signup failed" };
    } catch (error: any) {
      console.error("Signup failed:", error);
      return { success: false, message: error.message };
    }
  }

  updateUser(data: Partial<UserProfile>) {
    if (this.user) {
      this.user = { ...this.user, ...data };
      this.saveUser();

      const idx = this.users.findIndex(u => u.uid === this.user?.uid);
      if (idx !== -1) {
        this.users[idx] = { ...this.users[idx], ...data };
        this.saveUsers();
      }
    }
  }

  getUsers() {
    return this.users;
  }

  searchUsers(query: string) {
    const q = query.toLowerCase();
    return this.users.filter(u =>
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.institutionName && u.institutionName.toLowerCase().includes(q))
    );
  }

  async updateUserStatus(uid: string, status: UserStatus) {
    const user = this.users.find(u => u.uid === uid);
    if (user) {
      try {
        const oldStatus = user.status;
        await profileService.updateProfile(uid, { status });
        user.status = status;
        this.saveUsers();
        this.addAuditLog("User Status Updated", `User ${user.displayName} status changed from ${oldStatus} to ${status}`);

        if (this.user?.uid === uid) {
          this.user.status = status;
          this.saveUser();
        }
        window.dispatchEvent(new CustomEvent('store-updated'));
      } catch (error) {
        console.error("Failed to update user status:", error);
      }
    }
  }

  async updateUserVerification(uid: string, isVerified: boolean) {
    const user = this.users.find(u => u.uid === uid);
    if (user) {
      try {
        await profileService.updateProfile(uid, { isVerified });
        user.isVerified = isVerified;
        this.saveUsers();
        this.addAuditLog("User Verification Updated", `User ${user.displayName} verification set to ${isVerified}`);

        if (this.user?.uid === uid) {
          this.user.isVerified = isVerified;
          this.saveUser();
        }
        window.dispatchEvent(new CustomEvent('store-updated'));
      } catch (error) {
        console.error("Failed to update user verification:", error);
      }
    }
  }

  async deleteUser(uid: string) {
    const user = this.users.find(u => u.uid === uid);
    if (user) {
      try {
        await profileService.deleteUser(uid);
        this.users = this.users.filter(u => u.uid !== uid);
        this.saveUsers();
        this.addAuditLog("User Deleted", `User ${user.displayName} (${user.email}) deleted`);
        window.dispatchEvent(new CustomEvent('store-updated'));
        return { success: true };
      } catch (error: any) {
        console.error("Failed to delete user:", error);
        return { success: false, message: error.message };
      }
    }
    return { success: false, message: "User not found" };
  }

  async resetUserPassword(uid: string, newPassword: string) {
    const user = this.users.find(u => u.uid === uid);
    if (user) {
      try {
        const result = await profileService.resetPassword(uid, newPassword);
        this.addAuditLog("Password Reset", `Password reset for user ${user.displayName} (${user.email})`);
        return result;
      } catch (error: any) {
        console.error("Failed to reset password:", error);
        return { success: false, message: error.message };
      }
    }
    return { success: false, message: "User not found" };
  }

  getUserBids() {
    return this.userBids;
  }

  getBidHistory() {
    return this.bidHistory;
  }

  getAuditLogs() {
    return this.auditLogs;
  }

  async getBidsByAuctionId(auctionId: string) {
    return await auctionService.getBidsByAuctionId(auctionId);
  }

  async uploadImage(file: File, path: string) {
    return await storageService.uploadImage(file, path);
  }

  addAuditLog(action: string, details: string) {
    const log = {
      id: Math.random().toString(36).substr(2, 9),
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs = [log, ...this.auditLogs];
    this.saveAuditLogs();
  }

  getNotifications() {
    return this.notifications;
  }

  addNotification(data: Omit<Notification, "id" | "createdAt" | "read" | "userId">) {
    const newNotification: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      userId: this.user?.uid || "anon",
      createdAt: new Date().toISOString(),
      read: false,
      ...data,
    };
    this.notifications = [newNotification, ...this.notifications];
    this.saveNotifications();
    return newNotification;
  }

  markNotificationAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
    }
  }

  getSettings() {
    return this.settings;
  }

  updateSettings(data: Partial<SystemSettings>) {
    this.settings = { ...this.settings, ...data };
    this.saveSettings();
    this.addAuditLog("Settings Updated", "System configuration modified");
  }

  getStats() {
    const activeBids = Object.keys(this.userBids).length;
    const wonAuctions = this.auctions.filter(a =>
      a.status === AuctionStatus.CLOSED && this.userBids[a.id] === a.currentBid
    ).length;
    const totalSpent = Object.values(this.userBids).reduce((acc, val) => acc + val, 0);

    return {
      activeBids,
      wonAuctions,
      totalSpent,
      notificationsCount: this.notifications.filter(n => !n.read).length,
    };
  }

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase signOut error:", e);
    }
    
    // Completely clear local user state and storage
    this.user = null;
    localStorage.removeItem("bidzone_user");
    localStorage.removeItem("bidzone_user_bids");
    localStorage.removeItem("bidzone_notifications");
    
    // Also clear supabase auth token from localStorage if we're on a weird environment
    const sbKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
    if (sbKey) localStorage.removeItem(sbKey);
    
    window.dispatchEvent(new CustomEvent('store-updated'));
  }

  async deleteAuction(id: string) {
    try {
      await auctionService.deleteAuction(id);
      this.auctions = this.auctions.filter(a => a.id !== id);
      this.saveAuctions();
      this.addAuditLog("Auction Deleted", `Auction ID ${id} deleted`);
      window.dispatchEvent(new CustomEvent('store-updated'));
    } catch (error) {
      console.error("Failed to delete auction:", error);
    }
  }

  async likeAuction(auctionId: string) {
    if (!this.user) return false;
    try {
      const isLiked = await auctionService.likeAuction(auctionId, this.user.uid);
      const auction = this.auctions.find(a => a.id === auctionId);
      if (auction) {
        auction.likesCount = (auction.likesCount || 0) + (isLiked ? 1 : -1);
        this.saveAuctions();
        window.dispatchEvent(new CustomEvent('store-updated'));
      }
      return isLiked;
    } catch (error) {
      console.error("Failed to like auction:", error);
      return false;
    }
  }

  async checkIfLiked(auctionId: string) {
    if (!this.user) return false;
    try {
      return await auctionService.checkIfLiked(auctionId, this.user.uid);
    } catch (error) {
      console.error("Failed to check if liked:", error);
      return false;
    }
  }

  async shareAuction(auctionId: string) {
    try {
      await auctionService.shareAuction(auctionId);
      const auction = this.auctions.find(a => a.id === auctionId);
      if (auction) {
        auction.sharesCount = (auction.sharesCount || 0) + 1;
        this.saveAuctions();
        window.dispatchEvent(new CustomEvent('store-updated'));
      }
    } catch (error) {
      console.error("Failed to share auction:", error);
    }
  }

  async getInquiries() {
    if (!this.user) return [];
    
    const isDemoEmail = this.user.email.includes("@demo.com");
    if (isDemoEmail) {
      // Return dummy inquiry for demo buyer
      if (this.user.role === UserRole.BUYER) {
        return [{
          id: "demo-inq-1",
          auctionId: "1",
          auctionTitle: "Prime Commercial Land in Kathmandu",
          buyerId: this.user.uid,
          buyerName: this.user.displayName,
          institutionId: "inst1",
          message: "Is the documentation for this land complete?",
          status: "Replied",
          replyText: "Yes, all legal documentation and valuation reports are available for review.",
          createdAt: new Date().toISOString()
        }];
      }
      return [];
    }

    try {
      if (this.user.role === UserRole.BUYER) {
        return await inquiryService.getInquiriesForBuyer(this.user.uid);
      } else if (this.user.role === UserRole.INSTITUTION) {
        return await inquiryService.getInquiriesForInstitution(this.user.uid);
      }
    } catch (e) {
      console.warn("Failed to fetch inquiries from Supabase:", e);
      return [];
    }
    return [];
  }

  async createInquiry(data: { auctionId: string, auctionTitle: string, institutionId: string, message: string }) {
    if (!this.user) throw new Error("Must be logged in");
    
    const isDemoEmail = this.user.email.includes("@demo.com");
    if (isDemoEmail) {
      toast.success("Inquiry sent! (Demo mode)");
      return {
        id: Math.random().toString(36).substr(2, 9),
        ...data,
        buyerId: this.user.uid,
        buyerName: this.user.displayName,
        status: "Pending",
        createdAt: new Date().toISOString()
      };
    }

    try {
      return await inquiryService.createInquiry({
        ...data,
        buyerId: this.user.uid,
        buyerName: this.user.displayName
      });
    } catch (e) {
      console.error("Failed to create inquiry:", e);
      throw e;
    }
  }

  async replyToInquiry(id: string, replyText: string) {
    return await inquiryService.replyToInquiry(id, replyText);
  }
}

export const store = new Store();
