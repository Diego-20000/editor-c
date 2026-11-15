#include <stdio.h>
int main() { char C; int K = 0; for (C = 'a'; C <= 'z'; C += 5) printf("%c%c ", C, C - 32); printf("\n"); for (C = '0'; C <= '9'; C++) K += C - '0'; printf("%d %d %c %d\n", K, 'z' - 'a' + 1, 'A' + 25, '9' - '0'); C = 'x'; C = (C - 'a' + 3) % 26 + 'a'; printf("%c\n", C); printf("%d %d\n", 'a' < 'B', 'A' < 'b'); return 0; }
