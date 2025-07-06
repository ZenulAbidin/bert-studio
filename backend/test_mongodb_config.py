#!/usr/bin/env python3
"""
Test script to verify MongoDB configuration is loading from .env.local
"""

from config import config

def test_mongodb_config():
    """Test that MongoDB configuration is loaded correctly."""
    print("=== MongoDB Configuration Test ===")
    print(f"Connection String: {config.MONGODB_CONNECTION_STRING}")
    print(f"Database Name: {config.MONGODB_DATABASE_NAME}")
    
    # Test that the connection string is not the default localhost
    if "localhost:27017" in config.MONGODB_CONNECTION_STRING:
        print("❌ WARNING: Using default localhost connection string!")
        return False
    else:
        print("✅ SUCCESS: Using custom connection string from .env.local")
        return True

def test_environment_loading():
    """Test that environment variables are being loaded correctly."""
    print("\n=== Environment Loading Test ===")
    
    import os
    env_connection_string = os.getenv("MONGODB_CONNECTION_STRING")
    
    if env_connection_string:
        print(f"Environment Variable: {env_connection_string}")
        if "localhost:27017" not in env_connection_string:
            print("✅ SUCCESS: Environment variable is set correctly")
            return True
        else:
            print("❌ WARNING: Environment variable contains localhost")
            return False
    else:
        print("❌ WARNING: MONGODB_CONNECTION_STRING not found in environment")
        return False

if __name__ == "__main__":
    config_ok = test_mongodb_config()
    env_ok = test_environment_loading()
    
    print(f"\n=== Summary ===")
    if config_ok and env_ok:
        print("✅ All tests passed! MongoDB is using .env.local configuration.")
        print("✅ Your Python backend will now use the MONGODB_CONNECTION_STRING from .env.local")
    else:
        print("❌ Some tests failed. Check your configuration.") 