#include <stdio.h>
#include <ctype.h>
int main() { char T[] = "Hola Mundo 123!"; int I, M = 0, D = 0, E = 0; for (I = 0; T[I] != '\0'; I++) { if (isupper(T[I])) M++; if (isdigit(T[I])) D++; if (isspace(T[I])) E++; T[I] = toupper(T[I]); } printf("%s %d %d %d\n", T, M, D, E); printf("%c %c %d %d\n", tolower('Q'), toupper('9'), isalpha('z') != 0, isalnum('_') != 0); return 0; }
