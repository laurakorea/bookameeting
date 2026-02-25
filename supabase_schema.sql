-- 예약 상태 Enum 타입
CREATE TYPE public.booking_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- 회사 테이블
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY, -- 8자리 난수 코드
    name TEXT NOT NULL,
    valid_until TIMESTAMPTZ, -- 서비스 만료일
    is_active BOOLEAN DEFAULT TRUE, -- 활성/비활성 제어
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

-- 회의실 예약 테이블
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id),
    user_id TEXT NOT NULL, -- 또는 profiles.id 참조 가능
    room_name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status public.booking_status DEFAULT 'pending',
    booking_reason TEXT,
    attendees_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- RLS 설정 및 정책
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 1. 회사 정보: 모든 인증된 사용자는 조회 가능, 수정은 관리자만 (시스템 정책 예시)
CREATE POLICY "회사 정보 조회" ON public.companies FOR SELECT TO authenticated USING (true);
-- 관리자 전용 권한 (예: service_role 또는 특정 클레임 체크)은 Supabase 대시보드에서 설정 권장

-- 2. 프로필 정보: 본인 정보만 조회/수정 가능
CREATE POLICY "내 프로필 관리" ON public.profiles FOR ALL TO authenticated 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

-- 3. 예약 정보: 소속 회사 정보만 조회 가능
CREATE POLICY "우리 회사 예약 조회" ON public.bookings FOR SELECT TO authenticated 
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "내 예약 생성/수정/취소" ON public.bookings FOR ALL TO authenticated 
    USING (user_id = (SELECT name FROM public.profiles WHERE id = auth.uid()));
