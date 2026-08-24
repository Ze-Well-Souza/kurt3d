import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILAMENT_COLORS, corHex } from "@/lib/domain/filament-colors";

/**
 * Seletor da cor-base do filamento, com a amostra ao lado de cada nome.
 *
 * A cor era texto livre e virou 26 grafias para 66 rolos, o que impedia contar
 * rolos por cor. Aqui ela sai da paleta canonica; o nome comercial ("Cobalto",
 * "Petroleo") vai no campo de tom, ao lado.
 */
export function ColorSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Selecionar cor" />
      </SelectTrigger>
      <SelectContent>
        {FILAMENT_COLORS.map((c) => (
          <SelectItem key={c.nome} value={c.nome}>
            <span className="inline-flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full border border-border"
                style={{ background: corHex(c.nome) }}
              />
              {c.nome}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
