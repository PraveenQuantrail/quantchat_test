import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { FiLock } from 'react-icons/fi';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { authApi } from '../../utils/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Login = ({ setIsAuthenticated }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [org, setOrg] = useState('Loading organization...');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [twoFactorAuth, setTwoFactorAuth] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // Fetch organization name on component mount
    useEffect(() => {
        const fetchOrganization = async () => {
            try {
                const data = await authApi.getOrganization();
                setOrg(data.name || 'Your Organization');
            } catch (error) {
                console.error('Failed to fetch organization:', error);
                setOrg('Your Organization');
            }
        };
        fetchOrganization();
    }, []);

    

    const handleLogin = async () => {
        setError('');
        setIsLoading(true);

        try {
            if (!email || !password) {
                throw new Error('Email and password are required');
            }

            const response = await authApi.login(email, password);


            // console.log(response)

            // Handle session storage based on remember me
            if (rememberMe) {
                localStorage.setItem('session', JSON.stringify({
                    token: response.token,
                    expires: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
                }));
            } else {
                sessionStorage.setItem('session', JSON.stringify({
                    token: response.token,
                    expires: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
                }));
            }

            // Show success toast and then redirect
            toast.success('Login successful!', {
                onClose: () => {
                    setIsAuthenticated(true); 
                    navigate('/chat');
                }
            });

        } catch (error) {
            console.error('Login error:', error);

            // Handle specific error messages
            if (error.message.includes('password')) {
                setError('Invalid password');
            } else if (error.message.includes('email') || error.message.includes('user')) {
                setError('Invalid email address');
            } else {
                setError(error.message || 'Login failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async (credentialResponse) => {
        setError('');
        setIsLoading(true);

        try {
            if (!credentialResponse?.credential) {
                throw new Error('No credential received from Google');
            }

            const response = await authApi.googleLogin(credentialResponse.credential);

            localStorage.setItem('session', JSON.stringify({
                token: response.token,
                expires: Date.now() + 30 * 24 * 60 * 60 * 1000
            }));

            // Show success toast and then redirect after a short delay
            toast.success('Login successful!', {
                onClose: () => {
                    setIsAuthenticated(true);
                    navigate('/chat');
                }
            });
        } catch (error) {
            console.error('Google login error:', error);
            setError(error.message || 'Google authentication failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <ToastContainer
                    position="top-center"
                    autoClose={3000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="colored"
                />

                <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 mx-4 mt-4 mb-4 fade-in border border-gray-300" style={{ padding: '24px' }}>
                    <div className="flex flex-col items-center mb-4">
                        <div className="bg-[#5D3FD3] p-4 rounded-md mb-2 flex items-center justify-center">
                            <FiLock size={36} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-center">Login</h2>
                    </div>

                    {error && (
                        <div className="bg-red-100 text-red-700 p-2 mb-4 rounded text-sm border border-red-200">{error}</div>
                    )}

                    <label className="block text-gray-700 text-sm font-bold mb-1">Organization</label>
                    <input
                        className="w-full px-3 py-2 border border-gray-300 rounded mb-4 bg-gray-50 text-gray-700 cursor-default focus:outline-none"
                        value={org}
                        readOnly
                    />

                    <label className="block text-gray-700 text-sm font-bold mb-1">Email Address</label>
                    <input
                        className="w-full px-3 py-2 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:border-transparent transition duration-200"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyPress={handleKeyPress}
                    />

                    <label className="block text-gray-700 text-sm font-bold mb-1">Password</label>
                    <div className="relative mb-4">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="w-full px-3 py-2 border border-gray-300 rounded pr-10 focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:border-transparent transition duration-200"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={handleKeyPress}
                        />
                        <div
                            aria-label="toggle password visibility"
                            className="absolute inset-y-0 right-2 flex items-center cursor-pointer text-gray-500 hover:text-gray-700"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                        </div>
                    </div>

                    <div className="flex flex-col space-y-2 mb-4">
                        <label className="flex items-center text-sm">
                            <input
                                type="checkbox"
                                className="mr-2 rounded focus:ring-2 focus:ring-[#5D3FD3] text-[#5D3FD3] border-gray-300"
                                checked={twoFactorAuth}
                                onChange={() => setTwoFactorAuth(!twoFactorAuth)}
                            />
                            Enable Two-Factor Authentication
                        </label>
                        <label className="flex items-center text-sm">
                            <input
                                type="checkbox"
                                className="mr-2 rounded focus:ring-2 focus:ring-[#5D3FD3] text-[#5D3FD3] border-gray-300"
                                checked={rememberMe}
                                onChange={() => setRememberMe(!rememberMe)}
                            />
                            Remember me
                        </label>
                    </div>

                    <div className="flex justify-end mb-4">
                        <button
                            className="text-[#5D3FD3] text-sm hover:text-[#4a30b0] hover:underline"
                            onClick={() => navigate('/forgot-password')}
                        >
                            Forgot Password?
                        </button>
                    </div>

                    <button
                        className={`w-full bg-[#5D3FD3] text-white font-semibold py-2 rounded hover:bg-[#6d4fe4] transition duration-200 mb-4 shadow-md focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:ring-offset-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        onClick={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>

                    <div className="flex items-center justify-center mb-4">
                        <div className="border-t border-gray-400 flex-grow mr-2"></div>
                        <span className="text-gray-500 text-sm">OR</span>
                        <div className="border-t border-gray-400 flex-grow ml-2"></div>
                    </div>

                    <div className="flex justify-center mb-4">
                        <GoogleLogin
                            onSuccess={handleGoogleLogin}
                            onError={() => {
                                setError('Google login failed');
                            }}
                            useOneTap
                            auto_select
                            text="signin_with"
                            shape="rectangular"
                            theme="outline"
                            size="large"
                            width="100%"
                        />
                    </div>

                    <div className="text-center text-sm">
                        Need access? <button className="text-[#5D3FD3] hover:text-[#4a30b0] hover:underline">Request Access</button>
                    </div>
                </div>
            </div>
        </GoogleOAuthProvider>
    );
};

export default Login;