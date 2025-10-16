import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AddUser from "../../components/UserManagement/AddUser";

// Mock props
const onCloseMock = jest.fn();
const onAddUserMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

function fillForm({
  name = "Test User",
  email = "testuser@example.com",
  phone = "9876543210",
  role = "Editor",
  address = "123 Street, City, State - 560001"
} = {}) {
  fireEvent.change(screen.getByLabelText(/Name \*/i), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/Email Address \*/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/Phone Number \*/i), { target: { value: phone } });
  // Use getAllByLabelText and .find to select correct radio
  const radios = screen.getAllByRole("radio");
  fireEvent.click(radios.find(radio => radio.value === role));
  // For address, use getByLabelText with { selector: 'textarea' }
  fireEvent.change(screen.getByLabelText(/Address \*/i, { selector: 'textarea' }), { target: { value: address } });
}

describe("AddUser", () => {
  it("renders all form fields and buttons", () => {
    render(<AddUser onClose={onCloseMock} onAddUser={onAddUserMock} />);
    expect(screen.getByText(/Add New User/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number \*/i)).toBeInTheDocument();
    // Use getAllByRole('radio') and check their values
    const radios = screen.getAllByRole('radio');
    expect(radios.find(r => r.value === "Admin")).toBeInTheDocument();
    expect(radios.find(r => r.value === "Editor")).toBeInTheDocument();
    expect(radios.find(r => r.value === "Readonly")).toBeInTheDocument();
    expect(screen.getByLabelText(/Address \*/i, { selector: 'textarea' })).toBeInTheDocument();
    expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
    expect(screen.getByText(/Add User/i)).toBeInTheDocument();
  });

  it("calls onClose when Cancel button is clicked", () => {
    render(<AddUser onClose={onCloseMock} onAddUser={onAddUserMock} />);
    fireEvent.click(screen.getByText(/Cancel/i));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when overlay is clicked", () => {
    render(<AddUser onClose={onCloseMock} onAddUser={onAddUserMock} />);
    fireEvent.click(screen.getByTestId("modal-overlay"));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close (X) button is clicked", () => {
    render(<AddUser onClose={onCloseMock} onAddUser={onAddUserMock} />);
    fireEvent.click(screen.getByLabelText(/Close/i));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("shows validation errors for empty fields", () => {
    render(<AddUser onClose={onCloseMock} onAddUser={onAddUserMock} />);
    fireEvent.click(screen.getByText(/Add User/i));
    expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Phone number is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Address is required/i)).toBeInTheDocument();
    expect(onAddUserMock).not.toHaveBeenCalled();
  });

  it("shows validation errors for invalid fields", () => {
    render(<AddUser onClose={onCloseMock} onAddUser={onAddUserMock} />);
    fillForm({
      name: "ab",
      email: "bademail",
      phone: "12345",
      address: "short"
    });
    fireEvent.click(screen.getByText(/Add User/i));
    expect(screen.getByText(/Name must be at least 3 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/Please enter a valid 10-digit phone number/i)).toBeInTheDocument();
    expect(screen.getByText(/Address must be at least 10 characters/i)).toBeInTheDocument();
    expect(onAddUserMock).not.toHaveBeenCalled();
  });

  it("submits form and calls onAddUser with correct data", () => {
    render(<AddUser onClose={onCloseMock} onAddUser={onAddUserMock} />);
    fillForm({
      name: "Valid User",
      email: "valid@email.com",
      phone: "1234567890",
      role: "Admin",
      address: "123 Main St, City, State - 560001"
    });
    fireEvent.click(screen.getByText(/Add User/i));
    expect(onAddUserMock).toHaveBeenCalledTimes(1);
    // Check payload
    const payload = onAddUserMock.mock.calls[0][0];
    expect(payload.name).toBe("Valid User");
    expect(payload.email).toBe("valid@email.com");
    expect(payload.phone).toBe("1234567890");
    expect(payload.role).toBe("Admin");
    expect(payload.address).toBe("123 Main St, City, State - 560001");
    expect(payload.status).toBe("Inactive");
    expect(payload.twoFA).toBe(false);
  });

  it("changes role selection", () => {
    render(<AddUser onClose={onCloseMock} onAddUser={onAddUserMock} />);
    // Default is Editor
    const radios = screen.getAllByRole("radio");
    expect(radios.find(r => r.value === "Editor")).toBeChecked();
    fireEvent.click(radios.find(r => r.value === "Admin"));
    expect(radios.find(r => r.value === "Admin")).toBeChecked();
    fireEvent.click(radios.find(r => r.value === "Readonly"));
    expect(radios.find(r => r.value === "Readonly")).toBeChecked();
  });

  it("closes modal on Escape key", () => {
    render(<AddUser onClose={onCloseMock} onAddUser={onAddUserMock} />);
    fireEvent.keyDown(window, { key: "Escape", code: "Escape" });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});