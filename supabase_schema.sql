-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'Buyer',
  status TEXT DEFAULT 'Active',
  institution_name TEXT,
  phone_number TEXT,
  photo_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Auctions table
CREATE TABLE auctions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  asset_type TEXT NOT NULL,
  base_price NUMERIC NOT NULL,
  reserve_price NUMERIC NOT NULL,
  current_bid NUMERIC NOT NULL,
  bid_count INTEGER DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'Active',
  address TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  institution_id UUID REFERENCES auth.users,
  institution_name TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  documents JSONB DEFAULT '[]',
  likes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Bids table
CREATE TABLE bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID REFERENCES auctions ON DELETE CASCADE NOT NULL,
  bidder_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  bidder_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  auction_id UUID REFERENCES auctions ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Audit Logs table
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, but only update their own
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auctions: Everyone can read active auctions, only institutions can create/update their own
CREATE POLICY "Auctions are viewable by everyone" ON auctions FOR SELECT USING (true);
CREATE POLICY "Institutions can create auctions" ON auctions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Institutions can update their own auctions" ON auctions FOR UPDATE USING (auth.uid() = institution_id);

-- Bids: Everyone can read bids, only authenticated users can place bids
CREATE POLICY "Bids are viewable by everyone" ON bids FOR SELECT USING (true);
CREATE POLICY "Authenticated users can place bids" ON bids FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Notifications: Users can only read/update their own notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Audit Logs: Only admins can read audit logs (simplified for now)
-- Inquiries table
CREATE TABLE inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID REFERENCES auctions ON DELETE CASCADE NOT NULL,
  auction_title TEXT NOT NULL,
  buyer_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  buyer_name TEXT NOT NULL,
  institution_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  reply_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Policies for Inquiries
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own inquiries" ON inquiries FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Institutions can view inquiries for their auctions" ON inquiries FOR SELECT USING (auth.uid() = institution_id);
CREATE POLICY "Buyers can create inquiries" ON inquiries FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Institutions can reply to inquiries" ON inquiries FOR UPDATE USING (auth.uid() = institution_id);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID REFERENCES auctions ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(auction_id, user_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are viewable by everyone" ON likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like auctions" ON likes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can unlike their own likes" ON likes FOR DELETE USING (auth.uid() = user_id);

-- RPC Functions for counters
CREATE OR REPLACE FUNCTION increment_bid(a_id UUID, new_amount NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE auctions
  SET current_bid = new_amount,
      bid_count = bid_count + 1
  WHERE id = a_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_likes(a_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE auctions
  SET likes_count = COALESCE(likes_count, 0) + 1
  WHERE id = a_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_likes(a_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE auctions
  SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1)
  WHERE id = a_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_shares(a_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE auctions
  SET shares_count = COALESCE(shares_count, 0) + 1
  WHERE id = a_id;
END;
$$ LANGUAGE plpgsql;
