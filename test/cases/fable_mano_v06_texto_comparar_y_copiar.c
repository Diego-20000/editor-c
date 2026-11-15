#include <stdio.h>
#include <string.h>
int main() { char A[10] = "perro", B[10] = "perra", C[10] = ""; printf("%d %d %d %d\n", strcmp(A, B) > 0, strcmp(B, A) < 0, strcmp(A, A), strcmp(C, A) < 0); strcpy(C, B); C[4] = 'o'; printf("%d %s\n", strcmp(A, C), C); strncat(C, "s y gatos", 1); printf("%s %d\n", C, (int) strlen(C)); printf("%d %d\n", strncmp("abc", "abd", 2), strcmp("a", "") > 0); return 0; }
