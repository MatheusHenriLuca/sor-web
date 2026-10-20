import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  LogIn, 
  AlertCircle, 
  User, 
  CheckCircle2, 
  Delete, 
  ShieldCheck, 
  Building2, 
  Lock
} from 'lucide-react';
import { UsuarioQualidade } from '../types';
import { spStore } from '../services/sharepointService';

interface VerifUserViewProps {
  onLoginSuccess: (user: UsuarioQualidade) => void;
}

export const VerifUserView: React.FC<VerifUserViewProps> = ({ onLoginSuccess }) => {
  const [reInput, setReInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [varserver, setVarserver] = useState(0);

  const allUsers = spStore.getUsuarios();
  const allAtivos = spStore.getBaseAtivos();

  useEffect(() => {
    const timer = setInterval(() => {
      setVarserver(spStore.getServerLagMinutes());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = () => {
    setErrorMessage('');
    const reNum = Number(reInput.trim());

    if (!reInput.trim() || isNaN(reNum)) {
      setErrorMessage("Por favor, digite um RE numérico válido!");
      return;
    }

    // Procura na lista 'Usuários ocorrências qualidade'
    const foundRegistered = allUsers.find(u => u.reAcesso === reNum);

    if (!foundRegistered) {
      // Se não estiver na lista de usuários especiais, entra como "User" (Operador)
      const ativo = allAtivos.find(a => a.numPessoal === reNum);
      const operadorUser: UsuarioQualidade = {
        id: Date.now(),
        nome: ativo ? ativo.nome : `Operador RE ${reNum}`,
        reAcesso: reNum,
        perfil: "User",
        cargo: ativo ? ativo.posicao : "Operador de Produção",
        setor: ativo ? ativo.unidadeOrg : "Chão de Fábrica"
      };

      spStore.setCurrentUser(operadorUser);
      onLoginSuccess(operadorUser);
    } else {
      // É um usuário registrado -> valida a senha
      if (foundRegistered.senha && foundRegistered.senha !== senhaInput) {
        setErrorMessage("ID ou senha incorretos!");
        return;
      }

      spStore.setCurrentUser(foundRegistered);
      onLoginSuccess(foundRegistered);
    }
  };

  const handleQuickSelect = (user: UsuarioQualidade) => {
    setReInput(String(user.reAcesso));
    setSenhaInput(user.senha || '');
    setErrorMessage('');
  };

  const handleKeypadPress = (val: string) => {
    if (val === 'back') {
      setReInput(prev => prev.slice(0, -1));
    } else if (val === 'clear') {
      setReInput('');
    } else {
      if (reInput.length < 8) {
        setReInput(prev => prev + val);
      }
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#faf9f8] flex flex-col justify-between font-sans select-none text-[#242424]">
      
      {/* Top Header - Microsoft 365 Style */}
      <header className="h-12 px-6 flex items-center justify-between border-b border-[#edebe9] bg-white">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-[#0f6cbd] text-white flex items-center justify-center font-bold text-xs">
            G
          </div>
          <div>
            <span className="text-xs font-bold text-[#242424]">
              SOR • Gestão da Qualidade Automotiva
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#616161]">
          <Building2 size={14} />
          <span>Gestamp Sorocaba • Planta Sorocaba</span>
        </div>
      </header>

      {/* Main Login Card - Fluent Planner Style */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg border border-[#edebe9] shadow-md p-6 sm:p-8 w-full space-y-5">
          
          {/* Header Card */}
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-[#f3f2f1] text-[#0f6cbd] flex items-center justify-center mx-auto mb-2">
              <KeyRound size={20} />
            </div>
            <h1 className="text-lg font-bold text-[#242424] tracking-tight">
              Identificação de Usuário
            </h1>
            <p className="text-xs text-[#616161]">
              Insira sua matrícula (RE) ou utilize o teclado touch de fábrica
            </p>
          </div>

          {/* Erro */}
          {errorMessage && (
            <div className="p-2.5 bg-[#fef2f2] border border-[#fecaca] rounded-md flex items-center gap-2 text-[#991b1b] text-xs font-medium">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Inputs Form */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#242424] mb-1">
                Matrícula de Empregado (RE) <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text"
                value={reInput}
                onChange={e => setReInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="Ex: 88123"
                className="w-full h-9 px-3 rounded-md border border-[#e1dfdd] bg-white text-center font-mono text-base font-bold text-[#242424] placeholder:text-[#8a8886] focus:border-[#0f6cbd] focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#242424] mb-1">
                Senha de Acesso <span className="text-[10px] text-[#8a8886] font-normal">(apenas cargos de chefia / engenharia)</span>
              </label>
              <input 
                type="password"
                value={senhaInput}
                onChange={e => setSenhaInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••"
                className="w-full h-9 px-3 rounded-md border border-[#e1dfdd] bg-white text-center text-sm font-medium text-[#242424] placeholder:text-[#8a8886] focus:border-[#0f6cbd] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Botão Entrar */}
          <button 
            type="button"
            onClick={handleLogin}
            className="w-full h-9 rounded-md bg-[#0f6cbd] hover:bg-[#0c5da5] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <LogIn size={15} />
            <span>Acessar o Cockpit</span>
          </button>

          {/* Teclado Numérico Virtual Compacto */}
          <div className="border-t border-[#edebe9] pt-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#616161] text-center mb-2.5">
              Teclado Numérico Touch
            </div>
            <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(String(num))}
                  className="h-9 bg-[#f3f2f1] hover:bg-[#edebe9] active:bg-[#e1dfdd] font-mono font-bold text-sm text-[#242424] rounded border border-[#e1dfdd] transition-colors"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleKeypadPress('clear')}
                className="h-9 bg-[#fef2f2] hover:bg-[#fee2e2] font-semibold text-xs text-[#dc2626] rounded border border-[#fecaca] transition-colors"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-9 bg-[#f3f2f1] hover:bg-[#edebe9] active:bg-[#e1dfdd] font-mono font-bold text-sm text-[#242424] rounded border border-[#e1dfdd] transition-colors"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('back')}
                className="h-9 bg-[#f3f2f1] hover:bg-[#edebe9] active:bg-[#e1dfdd] text-[#616161] hover:text-[#242424] rounded border border-[#e1dfdd] flex items-center justify-center transition-colors"
                title="Apagar"
              >
                <Delete size={16} />
              </button>
            </div>
          </div>

          {/* Perfis Rápidos */}
          <div className="border-t border-[#edebe9] pt-3.5 space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#616161] text-center">
              Acesso Rápido para Teste
            </div>
            <div className="grid grid-cols-2 gap-2 text-left">
              {allUsers.slice(0, 4).map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickSelect(u)}
                  className="p-2 text-left rounded-md border border-[#edebe9] hover:border-[#0f6cbd] hover:bg-[#f3f2f1] transition-colors group flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded bg-[#e0e7ff] text-[#4338ca] flex items-center justify-center font-bold text-[10px] shrink-0">
                    {getInitials(u.nome)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#242424] group-hover:text-[#0f6cbd] truncate">
                      {u.nome.split(' ')[0]}
                    </div>
                    <div className="text-[10px] text-[#616161] font-mono truncate">
                      RE: {u.reAcesso} • {u.perfil}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Footer Planner Style */}
      <footer className="h-10 px-6 flex items-center justify-between border-t border-[#edebe9] bg-white text-xs text-[#616161]">
        <span>Gestamp Brasil • Indústria 4.0</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${varserver > 5 ? 'bg-[#dc2626]' : 'bg-[#0f7b3a]'}`} />
          <span>Status: {varserver > 5 ? 'Oscilação de Rede' : 'Conectado'}</span>
        </div>
      </footer>

    </div>
  );
};

export default VerifUserView;
