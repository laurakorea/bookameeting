-- 회사 테이블
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY, -- 8자리 난수 코드
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT REFERENCES public.companies(id),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 회의실 예약 테이블 (기존 테이블 수정/참조 추가)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id),
    user_id TEXT NOT NULL, -- 또는 profiles.id 참조 가능
    room_name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled')),
    booking_reason TEXT,
    attendees_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- RLS 설정 및 정책 생략... (필요시 추가)
