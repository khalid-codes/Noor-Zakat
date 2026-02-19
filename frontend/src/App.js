import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Calculator, Coins, Scale, TrendingUp, Info, ChevronDown, ChevronUp } from "lucide-react";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "http://localhost:5055").replace(/\/$/, "");
const API = `${BACKEND_URL}/api`;

function App() {
  // State for live rates
  const [rates, setRates] = useState(null);
  const [nisabThresholds, setNisabThresholds] = useState(null);
  const [loading, setLoading] = useState(true);

  // State for assets
  const [assets, setAssets] = useState({
    gold_24k_grams: 0,
    gold_22k_grams: 0,
    gold_18k_grams: 0,
    silver_grams: 0,
    cash_in_hand: 0,
    bank_savings: 0,
    business_inventory: 0,
    investments: 0,
    receivables: 0,
    other_assets: 0
  });

  // State for liabilities
  const [liabilities, setLiabilities] = useState({
    short_term_debts: 0,
    immediate_expenses: 0,
    other_liabilities: 0
  });

  // Nisab basis selection
  const [nisabBasis, setNisabBasis] = useState("silver");

  // Calculation result
  const [zakatResult, setZakatResult] = useState(null);

  // Mobile summary panel toggle
  const [showSummary, setShowSummary] = useState(false);

  // Fetch live rates on mount
  useEffect(() => {
    fetchRates();
    fetchNisabThresholds();
  }, []);

  // Calculate Zakat whenever inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateZakat();
    }, 500); // Debounce calculation

    return () => clearTimeout(timer);
  }, [calculateZakat]);

  const fetchRates = async () => {
    try {
      const response = await axios.get(`${API}/rates/current`);
      const data = response.data;
      const isValidRates =
        data &&
        typeof data.gold_24k_per_gram === "number" &&
        typeof data.gold_22k_per_gram === "number" &&
        typeof data.silver_per_gram === "number";

      if (!isValidRates) {
        throw new Error("Invalid rates payload from backend");
      }

      setRates(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching rates:", error);
      setLoading(false);
    }
  };

  const fetchNisabThresholds = async () => {
    try {
      const response = await axios.get(`${API}/nisab/thresholds`);
      setNisabThresholds(response.data);
    } catch (error) {
      console.error("Error fetching Nisab thresholds:", error);
    }
  };

  const calculateZakat = useCallback(async () => {
    try {
      const response = await axios.post(`${API}/zakat/calculate`, {
        assets,
        liabilities,
        nisab_basis: nisabBasis
      });
      setZakatResult(response.data);
    } catch (error) {
      console.error("Error calculating Zakat:", error);
    }
  }, [assets, liabilities, nisabBasis]);

  const handleAssetChange = (field, value) => {
    setAssets(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const handleLiabilityChange = (field, value) => {
    setLiabilities(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="App">
      {/* Header */}
      <header className="App-header">
        <div className="relative z-10 text-center px-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Scale className="w-10 h-10" />
            <h1 className="text-4xl md:text-5xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              Noor Zakat Calculator
            </h1>
          </div>
          <p className="text-lg text-emerald-50 max-w-2xl mx-auto">
            Calculate your Zakat accurately according to Hanafi Madhhab
          </p>
        </div>
      </header>

      {/* Live Rates Ticker */}
      {rates &&
        typeof rates.gold_24k_per_gram === "number" &&
        typeof rates.gold_22k_per_gram === "number" &&
        typeof rates.silver_per_gram === "number" && (
        <div className="bg-white border-b border-stone-200 py-3 px-4 shadow-sm">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-stone-600">Live Rates:</span>
              </div>
              <div className="gold-badge" data-testid="rate-gold-24k">
                <Coins className="w-4 h-4" />
                Gold 24K: ₹{rates.gold_24k_per_gram.toFixed(2)}/g
              </div>
              <div className="gold-badge" data-testid="rate-gold-22k">
                <Coins className="w-4 h-4" />
                Gold 22K: ₹{rates.gold_22k_per_gram.toFixed(2)}/g
              </div>
              <div className="silver-badge" data-testid="rate-silver">
                <Coins className="w-4 h-4" />
                Silver: ₹{rates.silver_per_gram.toFixed(2)}/g
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Assets & Liabilities */}
          <div className="lg:col-span-8 space-y-8 animate-fade-in">

            {/* Nisab Selection */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-700 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-amber-900 mb-2">Select Nisab Calculation Basis</h3>
                  <p className="text-sm text-amber-800 mb-4">
                    Choose whether to calculate Nisab based on gold or silver. Silver-based Nisab has a lower threshold and is generally recommended.
                  </p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="nisab"
                        value="silver"
                        checked={nisabBasis === "silver"}
                        onChange={(e) => setNisabBasis(e.target.value)}
                        className="w-4 h-4 text-emerald-600"
                        data-testid="nisab-silver-radio"
                      />
                      <span className="font-medium text-amber-900">
                        Silver-based ({nisabThresholds ? formatCurrency(nisabThresholds.silver_value_inr) : '...'}) - Recommended
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="nisab"
                        value="gold"
                        checked={nisabBasis === "gold"}
                        onChange={(e) => setNisabBasis(e.target.value)}
                        className="w-4 h-4 text-emerald-600"
                        data-testid="nisab-gold-radio"
                      />
                      <span className="font-medium text-amber-900">
                        Gold-based ({nisabThresholds ? formatCurrency(nisabThresholds.gold_value_inr) : '...'})
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Assets Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Calculator className="w-6 h-6 text-emerald-700" />
                <h2 className="text-3xl font-semibold text-emerald-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Your Assets
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gold 24K */}
                <div className="asset-card">
                  <label className="block text-sm font-semibold text-stone-600 mb-2 uppercase tracking-wider">
                    Gold 24K (grams)
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={assets.gold_24k_grams || ''}
                      onChange={(e) => handleAssetChange('gold_24k_grams', e.target.value)}
                      placeholder="0.00"
                      data-testid="input-gold-24k"
                    />
                  </div>
                </div>

                {/* Gold 22K */}
                <div className="asset-card">
                  <label className="block text-sm font-semibold text-stone-600 mb-2 uppercase tracking-wider">
                    Gold 22K (grams)
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={assets.gold_22k_grams || ''}
                      onChange={(e) => handleAssetChange('gold_22k_grams', e.target.value)}
                      placeholder="0.00"
                      data-testid="input-gold-22k"
                    />
                  </div>
                </div>

                {/* Gold 18K */}
                <div className="asset-card">
                  <label className="block text-sm font-semibold text-stone-600 mb-2 uppercase tracking-wider">
                    Gold 18K (grams)
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={assets.gold_18k_grams || ''}
                      onChange={(e) => handleAssetChange('gold_18k_grams', e.target.value)}
                      placeholder="0.00"
                      data-testid="input-gold-18k"
                    />
                  </div>
                </div>

                {/* Silver */}
                <div className="asset-card">
                  <label className="block text-sm font-semibold text-stone-600 mb-2 uppercase tracking-wider">
                    Silver (grams)
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={assets.silver_grams || ''}
                      onChange={(e) => handleAssetChange('silver_grams', e.target.value)}
                      placeholder="0.00"
                      data-testid="input-silver"
                    />
                  </div>
                </div>

                {/* Cash in Hand */}
                <div className="asset-card">
                  <label className="block text-sm font-semibold text-stone-600 mb-2 uppercase tracking-wider">
                    Cash in Hand
                  </label>
                  <div className="input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={assets.cash_in_hand || ''}
                      onChange={(e) => handleAssetChange('cash_in_hand', e.target.value)}
                      placeholder="0"
                      data-testid="input-cash-hand"
                    />
                  </div>
                </div>

                {/* Bank Savings */}
                <div className="asset-card">
                  <label className="block text-sm font-semibold text-stone-600 mb-2 uppercase tracking-wider">
                    Bank Savings
                  </label>
                  <div className="input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={assets.bank_savings || ''}
                      onChange={(e) => handleAssetChange('bank_savings', e.target.value)}
                      placeholder="0"
                      data-testid="input-bank-savings"
                    />
                  </div>
                </div>

                {/* Business Inventory */}
                <div className="asset-card">
                  <label className="block text-sm font-semibold text-stone-600 mb-2 uppercase tracking-wider">
                    Business Inventory
                  </label>
                  <div className="input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={assets.business_inventory || ''}
                      onChange={(e) => handleAssetChange('business_inventory', e.target.value)}
                      placeholder="0"
                      data-testid="input-business-inventory"
                    />
                  </div>
                </div>

                {/* Investments */}
                <div className="asset-card">
                  <label className="block text-sm font-semibold text-stone-600 mb-2 uppercase tracking-wider">
                    Investments/Stocks
                  </label>
                  <div className="input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={assets.investments || ''}
                      onChange={(e) => handleAssetChange('investments', e.target.value)}
                      placeholder="0"
                      data-testid="input-investments"
                    />
                  </div>
                </div>

                {/* Receivables */}
                <div className="asset-card">
                  <label className="block text-sm font-semibold text-stone-600 mb-2 uppercase tracking-wider">
                    Money Owed to You
                  </label>
                  <div className="input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={assets.receivables || ''}
                      onChange={(e) => handleAssetChange('receivables', e.target.value)}
                      placeholder="0"
                      data-testid="input-receivables"
                    />
                  </div>
                </div>

                {/* Other Assets */}
                <div className="asset-card">
                  <label className="block text-sm font-semibold text-stone-600 mb-2 uppercase tracking-wider">
                    Other Liquid Assets
                  </label>
                  <div className="input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={assets.other_assets || ''}
                      onChange={(e) => handleAssetChange('other_assets', e.target.value)}
                      placeholder="0"
                      data-testid="input-other-assets"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Liabilities Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Scale className="w-6 h-6 text-emerald-700" />
                <h2 className="text-3xl font-semibold text-emerald-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Your Liabilities
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Short-term Debts */}
                <div className="asset-card border-l-4 border-l-amber-500">
                  <label className="block text-sm font-semibold text-stone-600 mb-2 uppercase tracking-wider">
                    Short-term Debts
                  </label>
                  <div className="input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={liabilities.short_term_debts || ''}
                      onChange={(e) => handleLiabilityChange('short_term_debts', e.target.value)}
                      placeholder="0"
                      data-testid="input-short-term-debts"
                    />
                  </div>
                </div>

                {/* Immediate Expenses */}
                <div className="asset-card border-l-4 border-l-amber-500">
                  <label className="block text-sm font-semibold text-stone-600 mb-2 uppercase tracking-wider">
                    Immediate Expenses
                  </label>
                  <div className="input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={liabilities.immediate_expenses || ''}
                      onChange={(e) => handleLiabilityChange('immediate_expenses', e.target.value)}
                      placeholder="0"
                      data-testid="input-immediate-expenses"
                    />
                  </div>
                </div>

                {/* Other Liabilities */}
                <div className="asset-card border-l-4 border-l-amber-500">
                  <label className="block text-sm font-semibold text-stone-600 mb-2 uppercase tracking-wider">
                    Other Liabilities
                  </label>
                  <div className="input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={liabilities.other_liabilities || ''}
                      onChange={(e) => handleLiabilityChange('other_liabilities', e.target.value)}
                      placeholder="0"
                      data-testid="input-other-liabilities"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Mobile spacing for fixed summary */}
            {/* <div className="h-64 lg:hidden"></div> */}
          </div>

          {/* Right Column - Summary Panel */}
          <div className="lg:col-span-4">
            <div className="summary-panel" data-testid="summary-panel">
              {/* Mobile Toggle */}
              <button
                onClick={() => setShowSummary(!showSummary)}
                className="lg:hidden flex items-center justify-between w-full mb-4 text-emerald-900 font-semibold"
                data-testid="summary-toggle"
              >
                <span>Zakat Summary</span>
                {showSummary ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </button>

              <div className={`${showSummary ? 'block' : 'hidden'} lg:block`}>
                <h3 className="text-2xl font-semibold text-emerald-900 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Summary
                </h3>

                {zakatResult && (
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-stone-200">
                      <span className="text-stone-600">Total Assets:</span>
                      <span className="font-semibold text-emerald-900" data-testid="total-assets">
                        {formatCurrency(zakatResult.total_assets)}
                      </span>
                    </div>

                    <div className="flex justify-between py-2 border-b border-stone-200">
                      <span className="text-stone-600">Total Liabilities:</span>
                      <span className="font-semibold text-amber-700" data-testid="total-liabilities">
                        {formatCurrency(zakatResult.total_liabilities)}
                      </span>
                    </div>

                    <div className="flex justify-between py-2 border-b-2 border-emerald-900">
                      <span className="text-stone-700 font-semibold">Net Wealth:</span>
                      <span className="font-bold text-emerald-900" data-testid="net-wealth">
                        {formatCurrency(zakatResult.net_wealth)}
                      </span>
                    </div>

                    <div className="flex justify-between py-2">
                      <span className="text-stone-600 text-sm">Nisab Threshold ({zakatResult.nisab_basis}):</span>
                      <span className="font-semibold text-stone-700 text-sm" data-testid="nisab-threshold">
                        {formatCurrency(zakatResult.nisab_threshold)}
                      </span>
                    </div>

                    {zakatResult.is_zakat_applicable ? (
                      <div className="zakat-result" data-testid="zakat-applicable">
                        <div className="flex items-center gap-2 mb-2">
                          <Coins className="w-5 h-5 text-emerald-700" />
                          <span className="font-semibold text-emerald-800">Zakat Due:</span>
                        </div>
                        <div className="zakat-amount" data-testid="zakat-amount">
                          {formatCurrency(zakatResult.zakat_amount)}
                        </div>
                        <p className="text-sm text-emerald-700 mt-2">
                          Calculated at 2.5% of your net wealth
                        </p>
                      </div>
                    ) : (
                      <div className="bg-stone-100 border border-stone-300 rounded-lg p-4" data-testid="zakat-not-applicable">
                        <p className="text-stone-700 text-center">
                          Your wealth is below the Nisab threshold. Zakat is not obligatory at this time.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-emerald-950 text-emerald-50 py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            Calculations based on Hanafi Madhhab principles. For specific religious guidance, please consult a qualified Islamic scholar.
          </p>
          <p className="text-xs text-emerald-200 mt-2">
            © {new Date().getFullYear()} Noor Zakat Calculator
          </p>
        </div>
        <div className="footer-content">
          <p>© Designed and Developed By Mohd Khalid</p>

          <div className="social-links">
            <a
              href="https://www.linkedin.com/in/mohdkhalid17/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>

            <a
              href="https://github.com/khalid-codes"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
