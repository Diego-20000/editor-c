#include <stdio.h>
int main() { int A, M, D; scanf("%d %d", &M, &A); switch (M) { case 2: if ((A % 4 == 0 && A % 100 != 0) || A % 400 == 0) D = 29; else D = 28; break; case 4: case 6: case 9: case 11: D = 30; break; default: D = 31; } printf("%02d/%d: %d DIAS\n", M, A, D); return 0; }
