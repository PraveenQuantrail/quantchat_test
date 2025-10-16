import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ForgotPassword from "../../components/Login/ForgotPassword";
import { MemoryRouter } from "react-router-dom";
import * as api from "../../utils/api";

// Toastify mock
let lastToastOnClose;
jest.mock("react-toastify", () => ({
  toast: {
    success: (msg, opts) => {
      lastToastOnClose = opts && opts.onClose;
    },
    error: jest.fn(),
  },
  ToastContainer: () => <div data-testid="toast-container" />,
}));

// Mock react-router useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  jest.clearAllMocks();
  lastToastOnClose = undefined;
  sessionStorage.clear();
  jest.useRealTimers();
});

describe("ForgotPassword component", () => {
  it("renders initial email step", () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );
    expect(screen.getByText(/Forgot Password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /verify/i })).toBeInTheDocument();
  });

  it("sends OTP and advances to OTP step", async () => {
    jest.spyOn(api.passwordResetApi, "sendOTP").mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/email address/i), { target: { value: "test@email.com" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /verify/i }));
    });

    await act(async () => {
      if (lastToastOnClose) lastToastOnClose();
    });

    expect(await screen.findByText(/OTP has been sent to/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/6-digit otp/i)).toBeInTheDocument();
  });

  it("verifies OTP and advances to new password step", async () => {
    sessionStorage.setItem("resetEmail", "abc@email.com");
    sessionStorage.setItem("resetStep", "2");
    sessionStorage.setItem("resetTimer", "299");
    sessionStorage.setItem("isTimerRunning", "true");

    jest.spyOn(api.passwordResetApi, "verifyOTP").mockResolvedValue({ verified: true });

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/6-digit otp/i), { target: { value: "123456" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /verify otp/i }));
    });

    await act(async () => {
      if (lastToastOnClose) lastToastOnClose();
    });

    expect(await screen.findByText(/Email verified successfully/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your new password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm your new password")).toBeInTheDocument();
  });

  it("resends OTP on clicking Resend OTP", async () => {
    sessionStorage.setItem("resetEmail", "abc@email.com");
    sessionStorage.setItem("resetStep", "2");
    sessionStorage.setItem("resetTimer", "299");
    sessionStorage.setItem("isTimerRunning", "true");

    jest.spyOn(api.passwordResetApi, "sendOTP").mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /resend otp/i }));
    });

    await act(async () => {
      if (lastToastOnClose) lastToastOnClose();
    });

    expect(screen.getByText(/OTP has been sent to/i)).toBeInTheDocument();
  });

  it("shows error if passwords do not match", async () => {
    sessionStorage.setItem("resetEmail", "abc@email.com");
    sessionStorage.setItem("resetStep", "3");
    sessionStorage.setItem("resetToken", "dummy-token");

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Enter your new password"), { target: { value: "Password@123" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm your new password"), { target: { value: "WrongPass" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    });

    expect(screen.getByText(/Passwords don't match/i)).toBeInTheDocument();
  });

  it("resets password and redirects to login", async () => {
    sessionStorage.setItem("resetEmail", "abc@email.com");
    sessionStorage.setItem("resetStep", "3");
    sessionStorage.setItem("resetToken", "dummy-token"); // Needed for successful reset

    jest.spyOn(api.passwordResetApi, "resetPassword").mockResolvedValue({ reset: true });

    jest.useFakeTimers();

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Enter your new password"), { target: { value: "Password@123" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm your new password"), { target: { value: "Password@123" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    });

    await act(async () => {
      if (lastToastOnClose) lastToastOnClose();
      jest.advanceTimersByTime(2100); // ensure timer for redirect fires
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", { state: { passwordResetSuccess: true } });
    });

    jest.useRealTimers();
  });

  it("navigates to login page when clicking 'Go to Login'", () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /go to login/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("shows all password validation icons correctly", async () => {
    sessionStorage.setItem("resetEmail", "abc@email.com");
    sessionStorage.setItem("resetStep", "3");
    sessionStorage.setItem("resetToken", "dummy-token");

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    // Initially, no password, so all should be unmet except nospace
    expect(screen.getByText("Uppercase").previousSibling).toHaveClass("text-red-500");
    expect(screen.getByText("Lowercase").previousSibling).toHaveClass("text-red-500");
    expect(screen.getByText("Number").previousSibling).toHaveClass("text-red-500");
    expect(screen.getByText("Special char").previousSibling).toHaveClass("text-red-500");
    expect(screen.getByText("8+ characters").previousSibling).toHaveClass("text-red-500");
    expect(screen.getByText("No spaces").previousSibling).toHaveClass("text-green-500");

    // Type a valid password
    fireEvent.change(screen.getByPlaceholderText("Enter your new password"), { target: { value: "Abc123!@" } });

    expect(screen.getByText("Uppercase").previousSibling).toHaveClass("text-green-500");
    expect(screen.getByText("Lowercase").previousSibling).toHaveClass("text-green-500");
    expect(screen.getByText("Number").previousSibling).toHaveClass("text-green-500");
    expect(screen.getByText("Special char").previousSibling).toHaveClass("text-green-500");
    expect(screen.getByText("8+ characters").previousSibling).toHaveClass("text-green-500");
    expect(screen.getByText("No spaces").previousSibling).toHaveClass("text-green-500");
  });

  it("shows OTP expiry toast and disables timer when timer runs out", async () => {
    sessionStorage.setItem("resetEmail", "abc@email.com");
    sessionStorage.setItem("resetStep", "2");
    sessionStorage.setItem("resetTimer", "1");
    sessionStorage.setItem("isTimerRunning", "true");

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });

    // Should show error toast of OTP expiry
    expect(require("react-toastify").toast.error).toHaveBeenCalledWith(
      expect.stringContaining("OTP has expired"),
    );
  });

  it("shows error if sendOTP fails", async () => {
    jest.spyOn(api.passwordResetApi, "sendOTP").mockRejectedValue(new Error("Send OTP failed"));

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/email address/i), { target: { value: "fail@email.com" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /verify/i }));
    });

    expect(screen.getByText(/Send OTP failed/i)).toBeInTheDocument();
    expect(require("react-toastify").toast.error).toHaveBeenCalledWith("Send OTP failed");
  });

  it("shows error if verifyOTP fails", async () => {
    sessionStorage.setItem("resetEmail", "abc@email.com");
    sessionStorage.setItem("resetStep", "2");
    sessionStorage.setItem("resetTimer", "299");
    sessionStorage.setItem("isTimerRunning", "true");

    jest.spyOn(api.passwordResetApi, "verifyOTP").mockRejectedValue(new Error("Invalid OTP"));

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/6-digit otp/i), { target: { value: "222222" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /verify otp/i }));
    });

    expect(screen.getByText(/Invalid OTP/i)).toBeInTheDocument();
    expect(require("react-toastify").toast.error).toHaveBeenCalledWith("Invalid OTP");
  });

  it("shows error if resetPassword fails", async () => {
    sessionStorage.setItem("resetEmail", "abc@email.com");
    sessionStorage.setItem("resetStep", "3");
    sessionStorage.setItem("resetToken", "dummy-token");

    jest.spyOn(api.passwordResetApi, "resetPassword").mockRejectedValue(new Error("Reset failed"));

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Enter your new password"), { target: { value: "Password@123" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm your new password"), { target: { value: "Password@123" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    });

    expect(require("react-toastify").toast.error).toHaveBeenCalledWith("Reset failed");
    expect(screen.getByText((content) => content.includes("Reset failed"))).toBeInTheDocument();
  });

  it("handles password show/hide toggle", () => {
    sessionStorage.setItem("resetEmail", "abc@email.com");
    sessionStorage.setItem("resetStep", "3");
    sessionStorage.setItem("resetToken", "dummy-token");

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    const pwdField = screen.getByPlaceholderText("Enter your new password");
    const toggleBtn = pwdField.parentNode.querySelector(".cursor-pointer");

    // Default is password type
    expect(pwdField).toHaveAttribute("type", "password");

    // Click toggle
    fireEvent.click(toggleBtn);
    expect(pwdField).toHaveAttribute("type", "text");

    // Click again
    fireEvent.click(toggleBtn);
    expect(pwdField).toHaveAttribute("type", "password");
  });

  it("cleans up sessionStorage on unmount after step 3", () => {
    sessionStorage.setItem("resetEmail", "abc@email.com");
    sessionStorage.setItem("resetStep", "3");
    sessionStorage.setItem("resetToken", "dummy-token");
    sessionStorage.setItem("resetTimer", "100");
    sessionStorage.setItem("isTimerRunning", "true");

    const { unmount } = render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );
    unmount();

    expect(sessionStorage.getItem("resetEmail")).toBeNull();
    expect(sessionStorage.getItem("resetStep")).toBeNull();
    expect(sessionStorage.getItem("resetToken")).toBeNull();
    expect(sessionStorage.getItem("resetTimer")).toBeNull();
    expect(sessionStorage.getItem("isTimerRunning")).toBeNull();
  });

  it("calls checkStatus and keeps resetToken if status is verified", async () => {
    sessionStorage.setItem("resetEmail", "abc@email.com");
    sessionStorage.setItem("resetStep", "3");

    jest.spyOn(api.passwordResetApi, "checkStatus").mockImplementation(async (email) => {
      await new Promise(resolve => setTimeout(resolve, 20));
      return { status: "verified", resetToken: "newtoken123" };
    });

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(sessionStorage.getItem("resetToken")).toBe("newtoken123");
    }, { timeout: 2000 });
  });

  it("calls checkStatus and resets to step 1 if expired", async () => {
    sessionStorage.setItem("resetEmail", "abc@email.com");
    sessionStorage.setItem("resetStep", "3");
    sessionStorage.setItem("resetToken", "should_be_removed");

    jest.spyOn(api.passwordResetApi, "checkStatus").mockResolvedValue({ status: "expired" });

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(sessionStorage.getItem("resetToken")).toBeNull();
    });
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();
  });

  it("calls checkStatus and resets to step 1 if checkStatus errors", async () => {
    sessionStorage.setItem("resetEmail", "abc@email.com");
    sessionStorage.setItem("resetStep", "3");
    sessionStorage.setItem("resetToken", "should_be_removed");

    jest.spyOn(api.passwordResetApi, "checkStatus").mockRejectedValue(new Error("server error"));

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(sessionStorage.getItem("resetToken")).toBeNull();
    });
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();
    expect(require("react-toastify").toast.error).toHaveBeenCalled();
  });
});