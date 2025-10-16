import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineCheck, AiOutlineClose, AiOutlineMail } from 'react-icons/ai';
import { MdPassword, MdOutlineVerified, MdOutlineTimer } from 'react-icons/md';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { passwordResetApi } from '../../utils/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState(sessionStorage.getItem('resetEmail') || '');
  const [otp, setOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(parseInt(sessionStorage.getItem('resetStep')) || 1);
  const [timer, setTimer] = useState(parseInt(sessionStorage.getItem('resetTimer')) || 300);
  const [isTimerRunning, setIsTimerRunning] = useState(sessionStorage.getItem('isTimerRunning') === 'true');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();

  const validatePassword = (pass) => ({
    upper: /[A-Z]/.test(pass),
    lower: /[a-z]/.test(pass),
    number: /[0-9]/.test(pass),
    special: /[^A-Za-z0-9]/.test(pass),
    length: pass.length >= 8,
    nospace: !/\s/.test(pass),
  });

  const checks = validatePassword(newPass);
  const passwordsMatch = newPass && confirmPass && newPass === confirmPass;

  // Format timer to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer effect
  useEffect(() => {
    let interval;
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          const newTime = prev - 1;
          sessionStorage.setItem('resetTimer', newTime.toString());
          return newTime;
        });
      }, 1000);
    } else if (timer === 0) {
      setIsTimerRunning(false);
      sessionStorage.removeItem('isTimerRunning');
      toast.error('OTP has expired. Please request a new one.');
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  // Persist state changes
  useEffect(() => {
    if (email) {
      sessionStorage.setItem('resetEmail', email);
    }
    sessionStorage.setItem('resetStep', step.toString());
  }, [email, step]);

  // useEffect to check reset status on component mount
  useEffect(() => {
    const checkResetStatus = async () => {
      if (step === 3 && email) {
        try {
          const response = await passwordResetApi.checkStatus(email);
          if (response.status === 'verified' && response.resetToken) {
            // Store the reset token for the final step
            sessionStorage.setItem('resetToken', response.resetToken);
          } else if (response.status === 'expired' || response.status === 'not_started') {
            // Reset the process if expired or not started
            toast.error('Your reset session has expired. Please start again.');
            setStep(1);
            sessionStorage.removeItem('resetToken');
          }
        } catch (error) {
          console.error('Error checking reset status:', error);
          toast.error('Unable to verify reset status. Please start again.');
          setStep(1);
          sessionStorage.removeItem('resetToken');
        }
      }
    };

    checkResetStatus();
  }, [step, email]);

  const handleSendOTP = async () => {
    try {
      setIsVerifying(true);
      await passwordResetApi.sendOTP(email);
      toast.success('OTP has been sent to your email');
      setStep(2);
      setTimer(300);
      setIsTimerRunning(true);
      sessionStorage.setItem('resetTimer', '300');
      sessionStorage.setItem('isTimerRunning', 'true');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      setIsVerifying(true);
      await passwordResetApi.verifyOTP(email, otp);
      toast.success('OTP verified successfully');
      setStep(3);
      setIsTimerRunning(false);
      sessionStorage.removeItem('isTimerRunning');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setIsVerifying(true);
      await passwordResetApi.sendOTP(email);
      toast.success('New OTP has been sent to your email');
      setTimer(300);
      setIsTimerRunning(true);
      sessionStorage.setItem('resetTimer', '300');
      sessionStorage.setItem('isTimerRunning', 'true');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  // handleResetPassword to include resetToken
  const handleResetPassword = async () => {
    try {
      if (!passwordsMatch) {
        throw new Error('Passwords do not match');
      }

      const resetToken = sessionStorage.getItem('resetToken');
      if (!resetToken) {
        throw new Error('Reset token missing. Please start the process again.');
      }

      setIsResetting(true);
      await passwordResetApi.resetPassword(email, resetToken, newPass);
      
      // Clear all reset data
      sessionStorage.removeItem('resetEmail');
      sessionStorage.removeItem('resetStep');
      sessionStorage.removeItem('resetTimer');
      sessionStorage.removeItem('isTimerRunning');
      sessionStorage.removeItem('resetToken');

      toast.success('Password reset successfully! Redirecting to login...');
      
      setTimeout(() => {
        navigate('/', { state: { passwordResetSuccess: true } });
      }, 2000);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  // Clear session storage when component unmounts if process is complete
  useEffect(() => {
    return () => {
      if (step === 3) {
        sessionStorage.removeItem('resetEmail');
        sessionStorage.removeItem('resetStep');
        sessionStorage.removeItem('resetTimer');
        sessionStorage.removeItem('isTimerRunning');
        sessionStorage.removeItem('resetToken');
      }
    };
  }, [step]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 mt-4 fade-in border border-gray-300" style={{ padding: '24px' }}>
        <div className="flex flex-col items-center mb-4">
          <div className="bg-[#5D3FD3] p-4 rounded-md mb-2">
            <MdPassword size={36} className="text-white font-extrabold" />
          </div>
          <h2 className="text-2xl font-bold text-center">Forgot Password</h2>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-2 mb-4 rounded text-sm border border-red-200">{error}</div>
        )}

        {/* Step 1: Email Verification */}
        {step === 1 && (
          <>
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-1">
              Email Address
            </label>
            <div className="relative mb-4">
              <input
                id="email"
                className="w-full px-3 py-2 border border-gray-300 rounded pr-24 focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:border-transparent transition duration-200"
                placeholder="Enter your email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                onClick={handleSendOTP}
                disabled={!email || isVerifying}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 text-sm rounded-md ${!email || isVerifying ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#5D3FD3] text-white hover:bg-[#4a30b0]'}`}
              >
                {isVerifying ? 'Sending...' : 'Verify'}
              </button>
            </div>
          </>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <>
            <div className="mb-4 p-3 bg-blue-50 rounded-md flex items-start">
              <AiOutlineMail className="text-blue-500 mt-1 mr-2" />
              <div>
                <p className="text-sm text-blue-800">OTP has been sent to <span className="font-semibold">{email}</span></p>
                <p className="text-xs text-blue-600 mt-1">Check your inbox and enter the 6-digit code below</p>
              </div>
            </div>

            <label className="block text-gray-700 text-sm font-bold mb-1">OTP Verification</label>
            <div className="relative mb-2">
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded pr-24 focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:border-transparent transition duration-200"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <button
                onClick={handleVerifyOTP}
                disabled={otp.length !== 6 || isVerifying}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 text-sm rounded-md ${otp.length !== 6 || isVerifying ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#5D3FD3] text-white hover:bg-[#4a30b0]'}`}
              >
                {isVerifying ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>

            <div className="flex items-center justify-between mb-4 text-xs">
              <div className="flex items-center text-gray-600">
                <MdOutlineTimer className="mr-1" />
                <span>Expires in: {formatTime(timer)}</span>
              </div>
              <button
                onClick={handleResendOTP}
                disabled={isVerifying}
                className={`text-[#5D3FD3] hover:text-[#4a30b0] hover:underline text-sm ${isVerifying ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isVerifying ? 'Sending...' : 'Resend OTP'}
              </button>
            </div>
          </>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <>
            <div className="mb-4 p-3 bg-green-50 rounded-md flex items-start">
              <MdOutlineVerified className="text-green-500 mt-1 mr-2" />
              <div>
                <p className="text-sm text-green-800">Email verified successfully</p>
                <p className="text-xs text-green-600 mt-1">You can now set a new password</p>
              </div>
            </div>

            <label className="block text-gray-700 text-sm font-bold mb-1">New Password</label>
            <div className="relative mb-1">
              <input
                type={showNewPass ? 'text' : 'password'}
                className="w-full px-3 py-2 border border-gray-300 rounded pr-10 focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:border-transparent transition duration-200"
                placeholder="Enter your new password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
              <div
                className="absolute inset-y-0 right-2 flex items-center cursor-pointer text-gray-500 hover:text-gray-700"
                onClick={() => setShowNewPass(!showNewPass)}
              >
                {showNewPass ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 mb-4 text-xs">
              <div className="flex items-center">
                {checks.upper ? (
                  <AiOutlineCheck className="text-green-500 mr-1" />
                ) : (
                  <AiOutlineClose className="text-red-500 mr-1" />
                )}
                <span className={checks.upper ? 'text-green-600' : 'text-gray-500'}>Uppercase</span>
              </div>
              <div className="flex items-center">
                {checks.lower ? (
                  <AiOutlineCheck className="text-green-500 mr-1" />
                ) : (
                  <AiOutlineClose className="text-red-500 mr-1'}" />
                )}
                <span className={checks.lower ? 'text-green-600' : 'text-gray-500'}>Lowercase</span>
              </div>
              <div className="flex items-center">
                {checks.number ? (
                  <AiOutlineCheck className="text-green-500 mr-1" />
                ) : (
                  <AiOutlineClose className="text-red-500 mr-1" />
                )}
                <span className={checks.number ? 'text-green-600' : 'text-gray-500'}>Number</span>
              </div>
              <div className="flex items-center">
                {checks.special ? (
                  <AiOutlineCheck className="text-green-500 mr-1" />
                ) : (
                  <AiOutlineClose className="text-red-500 mr-1" />
                )}
                <span className={checks.special ? 'text-green-600' : 'text-gray-500'}>Special char</span>
              </div>
              <div className="flex items-center">
                {checks.length ? (
                  <AiOutlineCheck className="text-green-500 mr-1" />
                ) : (
                  <AiOutlineClose className="text-red-500 mr-1" />
                )}
                <span className={checks.length ? 'text-green-600' : 'text-gray-500'}>8+ characters</span>
              </div>
              <div className="flex items-center">
                {checks.nospace ? (
                  <AiOutlineCheck className="text-green-500 mr-1" />
                ) : (
                  <AiOutlineClose className="text-red-500 mr-1" />
                )}
                <span className={checks.nospace ? 'text-green-600' : 'text-gray-500'}>No spaces</span>
              </div>
            </div>

            <label className="block text-gray-700 text-sm font-bold mb-1">Confirm Password</label>
            <div className="relative mb-4">
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:border-transparent transition duration-200"
                placeholder="Confirm your new password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
              />
            </div>

            <div className="flex items-center mb-4 text-xs">
              {confirmPass ? (
                passwordsMatch ? (
                  <>
                    <AiOutlineCheck className="text-green-500 mr-1" />
                    <span className="text-green-600">Passwords match</span>
                  </>
                ) : (
                  <>
                    <AiOutlineClose className="text-red-500 mr-1" />
                    <span className="text-red-500">Passwords don't match</span>
                  </>
                )
              ) : (
                <span className="text-gray-500">Passwords must match</span>
              )}
            </div>

            <button
              className="w-full bg-[#5D3FD3] text-white font-semibold py-2 rounded hover:bg-[#4a30b0] transition duration-200 mb-4 shadow-md focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
              onClick={handleResetPassword}
              disabled={!passwordsMatch || !newPass || isResetting}
            >
              {isResetting ? 'Resetting...' : 'Reset Password'}
            </button>
          </>
        )}

        <div className="text-center text-sm">
          <span className="text-gray-600">Remember your password? </span>
          <button
            className="text-[#5D3FD3] hover:text-[#6d4fe4] hover:underline font-medium"
            onClick={() => navigate('/')}
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;