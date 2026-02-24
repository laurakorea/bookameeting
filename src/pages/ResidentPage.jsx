import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Timeline from '../components/Timeline';
import MyBookings from '../components/MyBookings';
import { Loader2, Calendar, ListChecks, LogOut } from 'lucide-react';

const ResidentPage = () => {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState('timeline'); // 'timeline' or 'my-bookings'

    useEffect(() => {
        const savedUser = localStorage.getItem('meetingroom_user');
        if (savedUser) {
            setIsLoading(true);
            setTimeout(() => {
                setUser(JSON.parse(savedUser));
                setIsLoading(false);
            }, 800);
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !phone) return;

        setIsLoading(true);
        try {
            if (!supabase) {
                alert('Supabase 연결 설정이 되어 있지 않습니다. .env 파일을 확인해 주세요.');
                setIsLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*, companies(name)')
                .eq('email', email)
                .eq('phone', phone)
                .single();

            if (error) {
                console.error('Login Error:', error);
                alert('로그인 중 오류가 발생했습니다: ' + error.message);
            } else if (data) {
                const userData = {
                    companyId: data.company_id,
                    companyName: data.companies?.name,
                    userId: data.name, // 기존 시스템 호환을 위해 name을 userId로 사용
                    name: data.name,
                    email: data.email
                };
                localStorage.setItem('meetingroom_user', JSON.stringify(userData));
                setUser(userData);
            } else {
                alert('등록된 사용자가 없거나 정보가 일치하지 않습니다.');
            }
        } catch (err) {
            console.error('Unexpected Login Error:', err);
            alert('예기치 않은 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
                <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-xl border border-gray-100">
                    <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">회의실 예약 로그인</h1>
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 px-1">이메일 주소</label>
                            <input
                                type="email"
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-mint-400 rounded-2xl outline-none transition-all focus:bg-white"
                                placeholder="example@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 px-1">휴대폰 번호</label>
                            <input
                                type="tel"
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-mint-400 rounded-2xl outline-none transition-all focus:bg-white"
                                placeholder="010-0000-0000"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-mint-400 hover:bg-mint-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-mint-100 active:scale-95 disabled:bg-gray-200 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" /> 로그인 중...
                                </>
                            ) : '로그인'}
                        </button>
                    </form>
                    <p className="mt-8 text-center text-sm text-gray-400 font-medium">
                        처음이신가요? <a href="/register" className="text-mint-500 font-bold hover:underline">회원가입</a>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">
                        {view === 'timeline' ? '회의실 예약 현황' : '내 예약 관리'}
                    </h1>
                    <p className="text-gray-500 text-sm font-medium mt-1">{user.companyName} · {user.name} 님 환영합니다</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setView('timeline')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'timeline' ? 'bg-white text-mint-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Calendar className="w-4 h-4" />
                            타임라인
                        </button>
                        <button
                            onClick={() => setView('my-bookings')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'my-bookings' ? 'bg-white text-mint-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <ListChecks className="w-4 h-4" />
                            내 예약
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('meetingroom_user');
                            setUser(null);
                        }}
                        className="ml-4 p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                        title="로그아웃"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {view === 'timeline' ? (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-x-auto">
                        <Timeline user={user} />
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto">
                        <MyBookings user={user} />
                    </div>
                )}
            </main>
        </div>
    );
};

export default ResidentPage;
