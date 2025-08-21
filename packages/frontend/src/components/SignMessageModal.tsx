/**
 * Modal component for signing messages
 */

import React, { useState } from 'react';

interface SignMessageModalProps {
  onClose: () => void;
  onSign: (message: string) => Promise<string>;
}

const SignMessageModal: React.FC<SignMessageModalProps> = ({ onClose, onSign }) => {
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  /** Handle message signing */
  const handleSign = async () => {
    if (!message.trim()) {
      setError('Message is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const sig = await onSign(message);
      setSignature(sig);
    } catch (err) {
      setError('Failed to sign message');
    } finally {
      setLoading(false);
    }
  };

  /** Copy signature to clipboard */
  const copySignature = () => {
    navigator.clipboard.writeText(signature);
    setCopied(true);
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  /** Reset modal state */
  const handleReset = () => {
    setMessage('');
    setSignature('');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Sign Message</h2>
        
        {!signature ? (
          <div>
            <div className="mb-4">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Message to Sign
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={4}
                placeholder="Enter your message here..."
                disabled={loading}
              />
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSign}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                disabled={loading || !message.trim()}
              >
                {loading ? 'Signing...' : 'Sign Message'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Original Message</h3>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{message}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Signature</h3>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-mono text-gray-800 break-all">{signature}</p>
              </div>
              <button
                onClick={copySignature}
                className={`mt-2 text-sm transition-all duration-200 ${
                  copied 
                    ? 'text-green-600 font-medium' 
                    : 'text-primary-600 hover:text-primary-700'
                }`}
              >
                {copied ? '✓ Copied!' : 'Copy Signature'}
              </button>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Sign Another
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignMessageModal;