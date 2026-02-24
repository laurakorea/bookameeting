import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { UserPlus, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const RegisterPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        companyId: '',
        name: '',
        email: '',
        phone: ''
    });
    const [step, setStep] = useState(1); // 1: 회사 ID 입력, 2: 사용자 정보 입력
    const [isValidating, setIsValidating] = useState(false);
    const [companyError, setCompanyError] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    // 회사 ID 유효성 검사 함수 (수동 실행으로 변경)
    const handleValidateCompany = async () => {
        if (!formData.companyId || formData.companyId.length < 4) {
            setCompanyError('회사 ID를 입력해주세요 (최소 4자)');
            return;
        }

        setIsValidating(true);
        setCompanyError('');

        if (supabase) {
            const { data, error } = await supabase
                .from('companies')
                .select('name')
                .eq('id', formData.companyId.toUpperCase())
                .single();

            if (data) {
                setCompanyName(data.name);
                setCompanyError('');
                setStep(2); // 검증 성공 시 2단계로 이동
            } else {
                setCompanyName('');
                setCompanyError('유효하지 않은 회사 ID입니다. (8자리 난수 코드를 입력하세요)');
            }
        } else {
            setCompanyError('Supabase 서버에 연결할 수 없습니다. (.env 설정 확인)');
        }
        setIsValidating(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (step !== 2) return;

        if (!supabase) {
            alert('Supabase 연결 설정이 되어 있지 않습니다.');
            return;
        }

        const { error } = await supabase.from('profiles').insert([{
            company_id: formData.companyId.toUpperCase(),
            name: formData.name,
            email: formData.email,
            phone: formData.phone
        }]);
        if (error) {
            alert('가입 중 오류가 발생했습니다: ' + error.message);
            return;
        }

        setIsSuccess(true);
        setTimeout(() => navigate('/'), 2000);
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="bg-white p-10 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-4 animate-in fade-in zoom-in">
                    <div className="w-16 h-16 bg-mint-100 text-mint-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">회원가입 완료!</h2>
                    <p className="text-gray-500 text-sm">환영합니다. 곧 로그인 페이지로 이동합니다.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="mb-8 flex items-center gap-4">
                    {step === 1 ? (
                        <Link to="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </Link>
                    ) : (
                        <button onClick={() => setStep(1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">ANTIGRAVITY 가입</h1>
                        <p className="text-gray-400 text-sm font-medium">
                            {step === 1 ? '회사 코드를 입력하세요' : '사용자 정보를 입력하세요'}
                        </p>
                    </div>
                </header>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {step === 1 ? (
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block px-1">회사 ID (8자리 코드)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        maxLength={8}
                                        placeholder="예: A1B2C3D4"
                                        value={formData.companyId}
                                        onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                        className={`w-full bg-gray-50 border ${companyError ? 'border-red-400 focus:ring-red-100' : 'border-transparent focus:ring-mint-100'} rounded-2xl px-4 py-3 text-sm focus:ring-4 outline-none transition-all uppercase font-mono tracking-widest`}
                                    />
                                    {isValidating && <Loader2 className="w-4 h-4 absolute right-4 top-3.5 text-mint-400 animate-spin" />}
                                </div>
                                {companyError && <p className="mt-1.5 text-xs text-red-500 font-bold px-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {companyError}</p>}
                            </div>

                            <button
                                type="button"
                                onClick={handleValidateCompany}
                                disabled={isValidating || !formData.companyId}
                                className="w-full bg-mint-400 hover:bg-mint-500 disabled:bg-gray-200 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-mint-100 mt-4 active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isValidating ? <Loader2 className="w-5 h-5 animate-spin" /> : '다음 단계로'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <div className="bg-mint-50 p-4 rounded-2xl border border-mint-100 mb-4">
                                <p className="text-[10px] text-mint-400 font-bold uppercase tracking-wider mb-1">소속 협력사</p>
                                <p className="text-mint-600 font-bold text-lg">{companyName}</p>
                                <p className="text-mint-400 text-xs font-mono">{formData.companyId.toUpperCase()}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block px-1">이름</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="홍길동"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-gray-50 border-transparent focus:ring-mint-100 border rounded-2xl px-4 py-3 text-sm focus:ring-4 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block px-1">휴대폰 번호</label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="010-0000-0000"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-gray-50 border-transparent focus:ring-mint-100 border rounded-2xl px-4 py-3 text-sm focus:ring-4 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block px-1">이메일 주소</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="user@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-gray-50 border-transparent focus:ring-mint-100 border rounded-2xl px-4 py-3 text-sm focus:ring-4 outline-none transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-mint-400 hover:bg-mint-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-mint-100 mt-4 active:scale-95"
                            >
                                회원가입 완료
                            </button>
                        </div>
                    )}
                </form>

                <p className="mt-8 text-center text-sm text-gray-400">
                    이미 계정이 있으신가요? <Link to="/" className="text-mint-500 font-bold hover:underline">로그인</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
