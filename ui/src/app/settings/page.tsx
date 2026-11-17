'use client';
import { LanguageSwitch, T, useT } from '@/components/LanguageProvider';


import { useEffect, useState } from 'react';
import useSettings from '@/hooks/useSettings';
import { TopBar, MainContent } from '@/components/layout';
import { apiClient } from '@/utils/api';

export default function Settings() {
  const t = useT();
  const { settings, setSettings } = useSettings();
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('saving');

    apiClient
      .post('/api/settings', settings)
      .then(() => {
        setStatus('success');
      })
      .catch(error => {
        console.error('Error saving settings:', error);
        setStatus('error');
      })
      .finally(() => {
        setTimeout(() => setStatus('idle'), 2000);
      });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <TopBar>
        <div>
          <h1 className="text-base sm:text-lg"><T text={"Settings"} /></h1>
        </div>
        <div className="flex-1"></div>
      </TopBar>
      <MainContent>
        <LanguageSwitch />
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="HF_TOKEN" className="block text-sm font-medium mb-2"><T text={"Hugging Face Token"} /><div className="text-gray-500 text-sm ml-1"><T text={"Create a Read token on"} />{' '}
                      <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer">
                        {' '}
                        Huggingface
                      </a>{' '}<T text={"if you need to access gated/private models."} /></div>
                  </label>
                  <input
                    type="password"
                    id="HF_TOKEN"
                    name="HF_TOKEN"
                    value={settings.HF_TOKEN}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                    placeholder={t("Enter your Hugging Face token")}
                  />
                </div>

                <div>
                  <label htmlFor="TRAINING_FOLDER" className="block text-sm font-medium mb-2"><T text={"Training Folder Path"} /><div className="text-gray-500 text-sm ml-1"><T text={"We will store your training information here. Must be an absolute path. If blank, it will default to the output folder in the project root."} /></div>
                  </label>
                  <input
                    type="text"
                    id="TRAINING_FOLDER"
                    name="TRAINING_FOLDER"
                    value={settings.TRAINING_FOLDER}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                    placeholder={t("Enter training folder path")}
                  />
                </div>

                <div>
                  <label htmlFor="DATASETS_FOLDER" className="block text-sm font-medium mb-2"><T text={"Dataset Folder Path"} /><div className="text-gray-500 text-sm ml-1"><T text={"Where we store and find your datasets."} />{' '}
                      <span className="text-orange-800"><T text={"Warning: This software may modify datasets so it is recommended you keep a backup somewhere else or have a dedicated folder for this software."} /></span>
                    </div>
                  </label>
                  <input
                    type="text"
                    id="DATASETS_FOLDER"
                    name="DATASETS_FOLDER"
                    value={settings.DATASETS_FOLDER}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                    placeholder={t("Enter datasets folder path")}
                  />
                </div>

                <div>
                  <label htmlFor="MODELS_PATH" className="block text-sm font-medium mb-2"><T text={"Models Folder Path"} /><div className="text-gray-500 text-sm ml-1"><T text={"Some models support loading ComfyUI model weights directly. Models that do will be loaded from/downloaded to this path. Must be an absolute path. If blank, it will default to the models folder in the project root."} /></div>
                  </label>
                  <input
                    type="text"
                    id="MODELS_PATH"
                    name="MODELS_PATH"
                    value={settings.MODELS_PATH}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                    placeholder={t("Enter models folder path")}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={status === 'saving'}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'saving' ? t("Saving...") : t("Save Settings")}
          </button>

          {status === 'success' && <p className="text-green-500 text-center"><T text={"Settings saved successfully!"} /></p>}
          {status === 'error' && <p className="text-red-500 text-center"><T text={"Error saving settings. Please try again."} /></p>}
        </form>
      </MainContent>
    </>
  );
}
