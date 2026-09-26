import React, { useState } from 'react';
import { ClassFeeConfig, SchoolProfile } from '../types';
import { formatCurrency } from '../utils/numberToWords';
import { CheckCircle, Layers, Plus, Trash2, Users, X } from 'lucide-react';

interface ClassFeeMasterModalProps {
  classConfigs: ClassFeeConfig[];
  schoolProfile: SchoolProfile;
  onClose: () => void;
  onSaveClassConfigs: (configs: ClassFeeConfig[]) => Promise<void>;
}

export const ClassFeeMasterModal: React.FC<ClassFeeMasterModalProps> = ({
  classConfigs,
  schoolProfile,
  onClose,
  onSaveClassConfigs,
}) => {
  const [configs, setConfigs] = useState<ClassFeeConfig[]>([...classConfigs]);

  const handleChange = (index: number, field: keyof ClassFeeConfig, value: any) => {
    const updated = [...configs];
    updated[index] = { ...updated[index], [field]: value };
    setConfigs(updated);
  };

  const handleAddClass = () => {
    const nextNum = configs.length + 1;
    setConfigs([
      ...configs,
      {
        id: `cls_${Date.now()}`,
        className: `Class ${nextNum}`,
        actualFee: 35000,
        defaultInstallments: 7,
        defaultDueDayOfMonth: 10,
        startMonth: 5,
      },
    ]);
  };

  const handleRemoveClass = (index: number) => {
    setConfigs(configs.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    await onSaveClassConfigs(configs);
    onClose();
  };

  return (
    <div id="modal-class-fee-master" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Class Fee Master Configuration</h2>
              <p className="text-xs text-slate-400">
                Define default actual fees & installments across all grades
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Table Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700 dark:text-slate-300 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">
              Configure default fees to automatically populate when registering students:
            </span>
            <button
              type="button"
              onClick={handleAddClass}
              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Class</span>
            </button>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-3">Class Name</th>
                  <th className="py-2 px-3 text-right">Default Actual Fee</th>
                  <th className="py-2 px-3 text-center">Installments</th>
                  <th className="py-2 px-3 text-center">Due Day</th>
                  <th className="py-2 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {configs.map((cfg, idx) => (
                  <tr key={cfg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-1.5 px-3">
                      <input
                        type="text"
                        value={cfg.className}
                        onChange={(e) => handleChange(idx, 'className', e.target.value)}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-bold text-slate-800 dark:text-slate-200 text-xs"
                      />
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <span className="text-slate-400">{schoolProfile.currencySymbol}</span>
                        <input
                          type="number"
                          min="0"
                          value={cfg.actualFee}
                          onChange={(e) =>
                            handleChange(idx, 'actualFee', parseFloat(e.target.value) || 0)
                          }
                          className="w-24 text-right px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-slate-900 dark:text-white text-xs"
                        />
                      </div>
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <select
                        value={cfg.defaultInstallments}
                        onChange={(e) =>
                          handleChange(idx, 'defaultInstallments', parseInt(e.target.value) || 1)
                        }
                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <select
                        value={cfg.defaultDueDayOfMonth}
                        onChange={(e) =>
                          handleChange(idx, 'defaultDueDayOfMonth', parseInt(e.target.value) || 10)
                        }
                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold"
                      >
                        {[1, 5, 10, 15, 20, 25, 28].map((d) => (
                          <option key={d} value={d}>
                            {d}th
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveClass(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded"
                        title="Delete Class"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-save-class-master"
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Save Class Master</span>
          </button>
        </div>
      </div>
    </div>
  );
};
