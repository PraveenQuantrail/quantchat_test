import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import EditUser from "../../components/UserManagement/EditUser";

const mockUser = {
  id: 99,
  name: "Test User",
  email: "testuser@email.com",
  phone: "9876543210",
  role: "Editor",
  address: "123 Main St, City, State - 560001"
};

const onCloseMock = jest.fn();
const onUpdateUserMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

function getPhoneInput() {
  // Find the input for phone by name and type
  return screen.getAllByRole("textbox").find(
    el => el.getAttribute("name") === "phone" && el.tagName === "INPUT"
  );
}

function getAddressTextarea() {
  // Find the textarea for address by name
  return screen.getAllByRole("textbox").find(
    el => el.getAttribute("name") === "address" && el.tagName === "TEXTAREA"
  );
}

function getNameInput() {
  return screen.getAllByRole("textbox").find(
    el => el.getAttribute("name") === "name" && el.tagName === "INPUT"
  );
}

function getEmailInput() {
  return screen.getAllByRole("textbox").find(
    el => el.getAttribute("name") === "email" && el.tagName === "INPUT"
  );
}

function fillForm({
  phone = "1234567890",
  role = "Admin",
  address = "456 Changed St, New City, State - 560002"
} = {}) {
  fireEvent.change(getPhoneInput(), { target: { value: phone } });
  const radios = screen.getAllByRole("radio");
  fireEvent.click(radios.find(r => r.value === role));
  fireEvent.change(getAddressTextarea(), { target: { value: address } });
}

describe("EditUser", () => {
  it("renders all fields and buttons", () => {
    render(<EditUser user={mockUser} onClose={onCloseMock} onUpdateUser={onUpdateUserMock} />);
    expect(screen.getByText(/Edit User/i)).toBeInTheDocument();
    expect(getNameInput()).toHaveValue("Test User");
    expect(getEmailInput()).toHaveValue("testuser@email.com");
    expect(getPhoneInput()).toHaveValue("9876543210");
    const radios = screen.getAllByRole("radio");
    expect(radios.find(r => r.value === "Admin")).toBeInTheDocument();
    expect(radios.find(r => r.value === "Editor")).toBeInTheDocument();
    expect(radios.find(r => r.value === "Readonly")).toBeInTheDocument();
    expect(getAddressTextarea()).toBeInTheDocument();
    expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
    expect(screen.getByText(/Update User/i)).toBeInTheDocument();
  });

  it("shows the read-only name and email", () => {
    render(<EditUser user={mockUser} onClose={onCloseMock} onUpdateUser={onUpdateUserMock} />);
    expect(getNameInput()).toHaveValue("Test User");
    expect(getEmailInput()).toHaveValue("testuser@email.com");
    expect(getNameInput()).toHaveAttribute("readOnly");
    expect(getEmailInput()).toHaveAttribute("readOnly");
  });

  it("calls onClose when Cancel button is clicked", () => {
    render(<EditUser user={mockUser} onClose={onCloseMock} onUpdateUser={onUpdateUserMock} />);
    fireEvent.click(screen.getByText(/Cancel/i));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when overlay is clicked", () => {
    render(<EditUser user={mockUser} onClose={onCloseMock} onUpdateUser={onUpdateUserMock} />);
    fireEvent.click(document.querySelector(".bg-black"));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close (X) button is clicked", () => {
    render(<EditUser user={mockUser} onClose={onCloseMock} onUpdateUser={onUpdateUserMock} />);
    fireEvent.click(screen.getByLabelText(/Close/i));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("shows validation errors for empty and invalid fields", () => {
    render(<EditUser user={mockUser} onClose={onCloseMock} onUpdateUser={onUpdateUserMock} />);
    fireEvent.change(getPhoneInput(), { target: { value: "" } });
    fireEvent.change(getAddressTextarea(), { target: { value: "" } });
    fireEvent.click(screen.getByText(/Update User/i));
    expect(screen.getByText(/Phone number is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Address is required/i)).toBeInTheDocument();

    fireEvent.change(getPhoneInput(), { target: { value: "12345" } });
    fireEvent.change(getAddressTextarea(), { target: { value: "short" } });
    fireEvent.click(screen.getByText(/Update User/i));
    expect(screen.getByText(/Please enter a valid 10-digit phone number/i)).toBeInTheDocument();
    expect(screen.getByText(/Address must be at least 10 characters/i)).toBeInTheDocument();
    expect(onUpdateUserMock).not.toHaveBeenCalled();
  });

  it("submits form and calls onUpdateUser with correct data", () => {
    render(<EditUser user={mockUser} onClose={onCloseMock} onUpdateUser={onUpdateUserMock} />);
    fillForm();
    fireEvent.click(screen.getByText(/Update User/i));
    expect(onUpdateUserMock).toHaveBeenCalledTimes(1);
    expect(onUpdateUserMock.mock.calls[0][0]).toBe(99); // user id
    const payload = onUpdateUserMock.mock.calls[0][1];
    expect(payload.phone).toBe("1234567890");
    expect(payload.role).toBe("Admin");
    expect(payload.address).toBe("456 Changed St, New City, State - 560002");
  });

  it("changes role selection", () => {
    render(<EditUser user={mockUser} onClose={onCloseMock} onUpdateUser={onUpdateUserMock} />);
    const radios = screen.getAllByRole("radio");
    expect(radios.find(r => r.value === "Editor")).toBeChecked();
    fireEvent.click(radios.find(r => r.value === "Admin"));
    expect(radios.find(r => r.value === "Admin")).toBeChecked();
    fireEvent.click(radios.find(r => r.value === "Readonly"));
    expect(radios.find(r => r.value === "Readonly")).toBeChecked();
  });

  it("closes modal on Escape key", () => {
    render(<EditUser user={mockUser} onClose={onCloseMock} onUpdateUser={onUpdateUserMock} />);
    fireEvent.keyDown(window, { key: "Escape", code: "Escape" });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});