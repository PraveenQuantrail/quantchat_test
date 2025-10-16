import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import Login from "../../components/Login/Login";
import { MemoryRouter } from "react-router-dom";
import * as api from "../../utils/api";

// Mock react-toastify
let lastToastOnClose;
jest.mock("react-toastify", () => {
  return {
    toast: {
      success: (msg, opts) => {
        lastToastOnClose = opts && opts.onClose;
      }
    },
    ToastContainer: () => <div data-testid="toast-container" />,
  };
});

// Mock Google OAuth
jest.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }) => <div>{children}</div>,
  GoogleLogin: ({ onSuccess, onError }) => (
    <>
      <button
        data-testid="google-login"
        onClick={() => onSuccess({ credential: "mock" })}
      >
        Google Login
      </button>
      <button
        data-testid="google-login-fail"
        onClick={() => onError && onError()}
      >
        Google Login Fail
      </button>
    </>
  ),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("Login component", () => {
  let setIsAuthenticatedMock;

  beforeEach(() => {
    setIsAuthenticatedMock = jest.fn();
    jest.clearAllMocks();
    lastToastOnClose = undefined;
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("renders login form and organization name", async () => {
    jest.spyOn(api.authApi, "getOrganization").mockResolvedValue({ name: "TestOrg" });

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={setIsAuthenticatedMock} />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByDisplayValue("TestOrg")).toBeInTheDocument());
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByTestId("toast-container")).toBeInTheDocument();
  });

  it("shows error if email or password is missing", async () => {
    jest.spyOn(api.authApi, "getOrganization").mockResolvedValue({ name: "TestOrg" });

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={setIsAuthenticatedMock} />
      </MemoryRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^login$/i }));
    });
    await waitFor(() => {
      expect(document.querySelector('.bg-red-100')).toBeTruthy();
    });
  });

  it("handles successful login, sets storage, and redirects", async () => {
    jest.spyOn(api.authApi, "getOrganization").mockResolvedValue({ name: "Your Organization" });
    jest.spyOn(api.authApi, "login").mockResolvedValue({ token: "test-token" });

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={setIsAuthenticatedMock} />
      </MemoryRouter>
    );

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/email address/i), { target: { value: "test@test.com" } });
      fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: "password" } });
      fireEvent.click(screen.getByRole("button", { name: /^login$/i }));
    });

    await act(async () => {
      if (lastToastOnClose) lastToastOnClose();
    });

    await waitFor(() => {
      expect(setIsAuthenticatedMock).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalled();
      const session = JSON.parse(window.sessionStorage.getItem("session") || "{}");
      const local = JSON.parse(window.localStorage.getItem("session") || "{}");
      expect(session.token === "test-token" || local.token === "test-token").toBeTruthy();
    });
  });

  it("remembers session in localStorage if rememberMe checked", async () => {
    jest.spyOn(api.authApi, "getOrganization").mockResolvedValue({ name: "Your Organization" });
    jest.spyOn(api.authApi, "login").mockResolvedValue({ token: "test-token" });

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={setIsAuthenticatedMock} />
      </MemoryRouter>
    );

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/email address/i), { target: { value: "test@test.com" } });
      fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: "password" } });
      fireEvent.click(screen.getByLabelText(/Remember me/i));
      fireEvent.click(screen.getByRole("button", { name: /^login$/i }));
    });

    await act(async () => {
      if (lastToastOnClose) lastToastOnClose();
    });

    await waitFor(() => {
      expect(setIsAuthenticatedMock).toHaveBeenCalled();
      const local = JSON.parse(window.localStorage.getItem("session") || "{}");
      expect(local.token).toBe("test-token");
    });
  });

  it("shows error on login failure", async () => {
    jest.spyOn(api.authApi, "getOrganization").mockResolvedValue({ name: "Your Organization" });
    jest.spyOn(api.authApi, "login").mockRejectedValue({ message: "Invalid password" });

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={setIsAuthenticatedMock} />
      </MemoryRouter>
    );

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/email address/i), { target: { value: "test@test.com" } });
      fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: "wrongpass" } });
      fireEvent.click(screen.getByRole("button", { name: /^login$/i }));
    });

    await waitFor(() => {
      expect(document.querySelector('.bg-red-100')).toBeTruthy();
      expect(setIsAuthenticatedMock).not.toHaveBeenCalled();
    });
  });

  it("shows error if login throws a generic error", async () => {
    jest.spyOn(api.authApi, "getOrganization").mockResolvedValue({ name: "Your Organization" });
    jest.spyOn(api.authApi, "login").mockImplementation(() => { throw new Error("Something went wrong"); });

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={setIsAuthenticatedMock} />
      </MemoryRouter>
    );

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/email address/i), { target: { value: "test@test.com" } });
      fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: "wrongpass" } });
      fireEvent.click(screen.getByRole("button", { name: /^login$/i }));
    });

    await waitFor(() => {
      expect(document.querySelector('.bg-red-100')).toBeTruthy();
      expect(setIsAuthenticatedMock).not.toHaveBeenCalled();
    });
  });

  it("handles Google login success", async () => {
    jest.spyOn(api.authApi, "getOrganization").mockResolvedValue({ name: "Your Organization" });
    jest.spyOn(api.authApi, "googleLogin").mockResolvedValue({ token: "googletoken" });

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={setIsAuthenticatedMock} />
      </MemoryRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("google-login"));
    });

    await act(async () => {
      if (lastToastOnClose) lastToastOnClose();
    });

    await waitFor(() => {
      expect(setIsAuthenticatedMock).toHaveBeenCalled();
      expect(window.localStorage.getItem("session")).toContain("googletoken");
      expect(mockNavigate).toHaveBeenCalledWith("/chat");
    });
  });

  it("handles Google login failure and shows error (api error)", async () => {
    jest.spyOn(api.authApi, "getOrganization").mockResolvedValue({ name: "Your Organization" });
    jest.spyOn(api.authApi, "googleLogin").mockRejectedValue({ message: "Google authentication failed. Please try again." });

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={setIsAuthenticatedMock} />
      </MemoryRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("google-login"));
    });

    await waitFor(() => {
      expect(document.querySelector('.bg-red-100')).toBeTruthy();
      expect(setIsAuthenticatedMock).not.toHaveBeenCalled();
    });
  });

  it("handles Google login failure and shows error (no credential)", async () => {
    jest.spyOn(api.authApi, "getOrganization").mockResolvedValue({ name: "Your Organization" });
    jest.spyOn(api.authApi, "googleLogin").mockResolvedValue({ token: "googletoken" });

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={setIsAuthenticatedMock} />
      </MemoryRouter>
    );

    // simulate clicking the google login fail button
    await act(async () => {
      fireEvent.click(screen.getByTestId("google-login-fail"));
    });

    await waitFor(() => {
      expect(document.querySelector('.bg-red-100')).toBeTruthy();
      expect(setIsAuthenticatedMock).not.toHaveBeenCalled();
    });
  });

  it("toggles password visibility", () => {
    jest.spyOn(api.authApi, "getOrganization").mockResolvedValue({ name: "Your Organization" });

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={setIsAuthenticatedMock} />
      </MemoryRouter>
    );

    const pwdInput = screen.getByPlaceholderText(/password/i);
    expect(pwdInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByLabelText("toggle password visibility"));
    expect(pwdInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByLabelText("toggle password visibility"));
    expect(pwdInput).toHaveAttribute("type", "password");
  });

  it("redirects to forgot password on button click", () => {
    jest.spyOn(api.authApi, "getOrganization").mockResolvedValue({ name: "Your Organization" });

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={setIsAuthenticatedMock} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Forgot Password/i));
    expect(mockNavigate).toHaveBeenCalledWith("/forgot-password");
  });

  it("allows pressing Enter to trigger login", async () => {
    jest.spyOn(api.authApi, "getOrganization").mockResolvedValue({ name: "Your Organization" });
    jest.spyOn(api.authApi, "login").mockResolvedValue({ token: "test-token" });

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={setIsAuthenticatedMock} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/email address/i), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: "password" } });

    await act(async () => {
      fireEvent.keyPress(screen.getByPlaceholderText(/password/i), { key: "Enter", code: "Enter", charCode: 13 });
    });

    await act(async () => {
      if (lastToastOnClose) lastToastOnClose();
    });

    await waitFor(() => {
      expect(setIsAuthenticatedMock).toHaveBeenCalled();
    });
  });

  it("shows default org name if fetch fails", async () => {
    jest.spyOn(api.authApi, "getOrganization").mockRejectedValue(new Error("fail"));

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={setIsAuthenticatedMock} />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByDisplayValue("Your Organization")).toBeInTheDocument()
    );
  });

  it("toggles two-factor checkbox", () => {
    jest.spyOn(api.authApi, "getOrganization").mockResolvedValue({ name: "Your Organization" });

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={setIsAuthenticatedMock} />
      </MemoryRouter>
    );

    const tfaCheckbox = screen.getByLabelText(/Two-Factor Authentication/i);
    expect(tfaCheckbox.checked).toBe(false);
    fireEvent.click(tfaCheckbox);
    expect(tfaCheckbox.checked).toBe(true);
    fireEvent.click(tfaCheckbox);
    expect(tfaCheckbox.checked).toBe(false);
  });

  it("renders Request Access button", () => {
    jest.spyOn(api.authApi, "getOrganization").mockResolvedValue({ name: "Your Organization" });

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={setIsAuthenticatedMock} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Need access/i)).toBeInTheDocument();
    expect(screen.getByText(/Request Access/i)).toBeInTheDocument();
  });
});