import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Mail } from 'lucide-react';

const AccessBlocked = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const reason = location.state?.reason || 'expired'; // 'inactive' or 'expired'

    const handleLogout = () => {
        localStorage.removeItem('meetingroom_user');
        navigate('/');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
            <div className="w-full max-w-md p-10 bg-white rounded-3xl shadow-2xl border border-gray-100 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-red-100 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <ShieldAlert className="w-10 h-10" />
                </div>

                <h1 className="text-2xl font-bold text-gray-800 mb-4">
                    {reason === 'inactive' ? '접속 권한이 제한되었습니다' : '서비스 이용 기간이 만료되었습니다'}
                </h1>

                <p className="text-gray-500 text-sm leading-relaxed mb-10">
                    {reason === 'inactive'
                        ? '귀하의 소속 회사가 관리자에 의해 비활성화 처리되었습니다. 상세 내용은 관리팀에 문의해 주세요.'
                        : '서비스 계약 기간이 만료되어 접속이 제한됩니다. 연장을 원하시면 관리자에게 연락 바랍니다.'}
                </p>

                <div className="space-y-4">
                    <button
                        onClick={handleLogout}
                        className="w-full py-4 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-5 h-5" /> 로그아웃 후 메인으로
                    </button>

                    <a
                        href="mailto:admin@example.com"
                        className="w-full py-4 bg-white border border-gray-200 text-gray-600 font-bold rounded-2xl transition-all hover:bg-gray-50 flex items-center justify-center gap-2"
                    >
                        <Mail className="w-5 h-5" /> 관리자에게 문의하기
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AccessBlocked;
