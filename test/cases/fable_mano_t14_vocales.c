#include <stdio.h>
#include <string.h>
#include <ctype.h>
int main() { char F[80]; int I, V = 0, P = 0, EN = 0; fgets(F, 80, stdin); for (I = 0; F[I] != '\0' && F[I] != '\n'; I++) { char C = tolower(F[I]); if (C == 'a' || C == 'e' || C == 'i' || C == 'o' || C == 'u') V++; if (!isspace(F[I]) && !EN) { P++; EN = 1; } else if (isspace(F[I])) EN = 0; } printf("%d vocales, %d palabras, %d letras\n", V, P, I); return 0; }
