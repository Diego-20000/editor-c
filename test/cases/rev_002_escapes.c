#include <stdio.h>
#include <string.h>
int main()
{
    char S[20] = "ni\303\261o";
    printf("%s|%d\n", S, (int)strlen(S));
    printf("ni\303\261o|\xc3\xb1|\n");
    printf("%d %d\n", S[2], S[3]);
    printf("[%.2s][%5s]\n", S, S);
    putchar(0xc3); putchar(0xb1); putchar('\n');
    printf("%c%c\n", 0303, 0261);
    return 0;
}
