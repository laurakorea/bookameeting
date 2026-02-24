# Supabase 연동 가이드라인 (ANTIGRAVITY Meeting Room)

현재 구현된 애플리케이션을 실제 Supabase 데이터베이스와 연결하기 위한 단계별 절차입니다.

## 1. Supabase 프로젝트 생성
1.  [Supabase Dashboard](https://supabase.com/dashboard)에 로그인합니다.
2.  **New Project**를 클릭하여 새로운 프로젝트를 생성합니다.
3.  프로젝트 이름과 데이터베이스 비밀번호를 설정하고, 지역을 **Seoul**로 선택하는 것이 좋습니다.

## 2. 데이터베이스 스키마 설정
1.  프로젝트 생성이 완료되면 왼쪽 메뉴에서 **SQL Editor**를 클릭합니다.
2.  **New Query**를 생성하고 프로젝트 폴더의 `supabase_schema.sql` 내용을 복사하여 붙여넣습니다.
3.  **Run** 버튼을 클릭하여 실행합니다. (성공 시 `companies`, `profiles`, `bookings` 테이블이 생성됩니다.)

## 3. 환경 변수 설정
1.  Supabase 프로젝트 설정(**Project Settings** > **API**)으로 이동합니다.
2.  **Project URL**과 **anon public key** 값을 복사합니다.
3.  애플리케이션 루트 폴더에 `.env` 파일을 생성하고 아래와 같이 저장합니다.

```env
VITE_SUPABASE_URL=복사한_URL_입력
VITE_SUPABASE_ANON_KEY=복사한_anon_key_입력
```

## 4. RLS (보안 정책) 설정 (권장)
현재 스키마에는 보안 정책이 생략되어 있습니다. 개발 단계에서는 조회/수정을 자유롭게 하기 위해 아래 명령을 SQL Editor에서 추가로 실행해주면 편리합니다.

```sql
-- 테이블 보안 정책 설정 (개발용: 모든 작업 허용)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for dev" ON public.companies FOR ALL USING (true);
CREATE POLICY "Allow all for dev" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow all for dev" ON public.bookings FOR ALL USING (true);
```

## 5. 앱 실행 및 확인
1.  환경 변수 적용을 위해 서버를 재시작합니다 (`npm run dev`).
2.  관리자 페이지(`/admin`)의 '회사 관리' 탭에서 회사를 생성해보거나, 회원가입 페이지에서 가입이 정상적으로 되는지 확인합니다.
