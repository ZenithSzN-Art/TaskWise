import type { FC } from 'react';
import { ListChecks } from 'lucide-react';

interface LogoProps {
  className?: string;
}

const Logo: FC<LogoProps> = ({ className }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ListChecks className="h-7 w-7 text-primary" />
      <h1 className="text-2xl font-headline font-semibold text-foreground">
        TaskWise
      </h1>
    </div>
  );
};

export default Logo;
